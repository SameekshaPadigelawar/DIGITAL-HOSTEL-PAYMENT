import http from 'node:http';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'hostelpay';

const COLLECTIONS = {
  owners: 'owners',
  tenants: 'tenants',
  payments: 'payments',
  complaints: 'complaints',
  reminders: 'reminders',
  ownerSettings: 'ownerSettings',
};

const DEFAULT_SHARING_OPTIONS = [
  { sharing: 'single', label: 'Single Sharing', rent: 12000 },
  { sharing: 'double', label: 'Double Sharing', rent: 8000 },
  { sharing: 'triple', label: 'Triple Sharing', rent: 6000 },
  { sharing: 'quad', label: 'Quad Sharing', rent: 5000 },
];

const DEFAULT_OWNER_SETTINGS = {
  hostelName: '',
  ownerName: '',
  upiId: '',
  location: '',
  qrCode: '',
  sharingOptions: DEFAULT_SHARING_OPTIONS,
};

let mongoClient;
let mongoDb;

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  json(res, 404, { success: false, message: 'Route not found.' });
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function connectMongo() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI. Set your MongoDB Atlas connection string before starting the backend.');
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db(MONGODB_DB_NAME);
  }

  return mongoDb;
}

async function collection(name) {
  const db = await connectMongo();
  return db.collection(COLLECTIONS[name]);
}

async function ensureIndexes() {
  const owners = await collection('owners');
  const tenants = await collection('tenants');
  const payments = await collection('payments');
  const ownerSettings = await collection('ownerSettings');

  await Promise.all([
    owners.createIndex({ email: 1 }, { unique: true }),
    tenants.createIndex({ email: 1 }, { unique: true }),
    tenants.createIndex({ ownerId: 1 }),
    payments.createIndex({ tenantId: 1, month: 1 }, { unique: true }),
    payments.createIndex({ transactionId: 1 }),
    ownerSettings.createIndex({ ownerId: 1 }, { unique: true }),
  ]);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        req.destroy();
        reject(new Error('Request body too large.'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function publicUser(user) {
  if (!user) return null;
  const { _id, password, ...safeUser } = user;
  return safeUser;
}

function publicDocument(document) {
  if (!document) return null;
  const { _id, ...safeDocument } = document;
  return safeDocument;
}

function sessionUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

function cleanOwnerSettings(settings = {}) {
  const sharingOptions = Array.isArray(settings.sharingOptions)
    ? settings.sharingOptions
        .map((option) => ({
          sharing: String(option.sharing || option.label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
          label: String(option.label || '').trim(),
          rent: Number(option.rent || 0),
        }))
        .filter((option) => option.sharing && option.label && option.rent > 0)
    : DEFAULT_SHARING_OPTIONS;

  return {
    hostelName: settings.hostelName || '',
    ownerName: settings.ownerName || '',
    upiId: settings.upiId || '',
    location: settings.location || '',
    qrCode: settings.qrCode || '',
    sharingOptions: sharingOptions.length ? sharingOptions : DEFAULT_SHARING_OPTIONS,
  };
}

function getRentForSharing(settings, sharing) {
  const options = cleanOwnerSettings(settings).sharingOptions;
  return options.find((option) => option.sharing === sharing)?.rent || 0;
}

function normalizeTransactionId(value = '') {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function findUserByEmail(email) {
  const owners = await collection('owners');
  const tenants = await collection('tenants');
  return (await owners.findOne({ email })) || tenants.findOne({ email });
}

async function findUserById(id) {
  const owners = await collection('owners');
  const tenants = await collection('tenants');
  return (await owners.findOne({ id })) || tenants.findOne({ id });
}

async function getHostel(ownerId) {
  const owners = await collection('owners');
  const ownerSettings = await collection('ownerSettings');
  const owner = await owners.findOne({ id: ownerId });
  if (!owner) return null;

  const settings = await ownerSettings.findOne({ ownerId });
  return {
    ownerId,
    hostelName: settings?.hostelName || owner.hostelName || 'Unnamed Hostel',
    location: settings?.location || owner.location || '',
    ownerName: settings?.ownerName || owner.name,
    sharingOptions: cleanOwnerSettings(settings).sharingOptions,
  };
}

async function getOwnerStats(ownerId) {
  const tenantsCollection = await collection('tenants');
  const paymentsCollection = await collection('payments');
  const tenants = await tenantsCollection.find({ ownerId }).toArray();
  const month = getCurrentMonth();
  const payments = await paymentsCollection.find({ month }).toArray();
  const tenantIds = new Set(tenants.map((tenant) => tenant.id));
  const ownerPayments = payments.filter((payment) => tenantIds.has(payment.tenantId));

  let expectedRevenue = 0;
  let received = 0;
  const defaulters = [];

  tenants.forEach((tenant) => {
    const rent = Number(tenant.monthlyRent || 0);
    expectedRevenue += rent;
    const paid = ownerPayments.find(
      (payment) => (
        payment.tenantId === tenant.id
        && payment.status === 'approved'
        && !payment.suspicious
      ),
    );

    if (paid) {
      received += Number(paid.amount || rent);
    } else {
      defaulters.push(publicUser(tenant));
    }
  });

  return {
    expectedRevenue,
    received,
    pending: expectedRevenue - received,
    defaulterCount: defaulters.length,
    defaulters,
    tenantCount: tenants.length,
    suspiciousPaymentCount: ownerPayments.filter((payment) => payment.suspicious || payment.status === 'rejected').length,
  };
}

function routeParts(url) {
  return url.pathname.split('/').filter(Boolean);
}

async function seedDemoData() {
  const owners = await collection('owners');
  const ownerExists = await owners.findOne({ id: 'owner_demo' });
  if (ownerExists) return;

  const tenants = await collection('tenants');
  const ownerSettings = await collection('ownerSettings');

  const owner = {
    id: 'owner_demo',
    role: 'owner',
    name: 'Rajesh Kumar',
    email: 'owner@hostelpay.com',
    password: 'owner123',
    phone: '9876543210',
    hostelName: 'Sunrise PG Hostel',
    location: 'Koramangala, Bangalore',
    createdAt: new Date().toISOString(),
  };

  const demoTenants = [
    {
      id: 'tenant_1',
      role: 'tenant',
      ownerId: 'owner_demo',
      hostelName: 'Sunrise PG Hostel',
      name: 'Priya Sharma',
      email: 'priya@email.com',
      password: 'tenant123',
      phone: '9123456780',
      address: 'Delhi',
      floor: '2',
      roomNumber: '201',
      sharing: 'double',
      occupation: 'student',
      monthlyRent: 8000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tenant_2',
      role: 'tenant',
      ownerId: 'owner_demo',
      hostelName: 'Sunrise PG Hostel',
      name: 'Amit Patel',
      email: 'amit@email.com',
      password: 'tenant123',
      phone: '9234567890',
      address: 'Mumbai',
      floor: '1',
      roomNumber: '105',
      sharing: 'single',
      occupation: 'working',
      monthlyRent: 12000,
      createdAt: new Date().toISOString(),
    },
  ];

  await owners.updateOne({ id: owner.id }, { $setOnInsert: owner }, { upsert: true });
  await Promise.all(
    demoTenants.map((tenant) => (
      tenants.updateOne({ id: tenant.id }, { $setOnInsert: tenant }, { upsert: true })
    )),
  );
  await ownerSettings.updateOne(
    { ownerId: 'owner_demo' },
    {
      $set: {
        ownerId: 'owner_demo',
        hostelName: 'Sunrise PG Hostel',
        ownerName: 'Rajesh Kumar',
        upiId: 'rajesh@upi',
        location: 'Koramangala, Bangalore',
        qrCode: '',
        sharingOptions: DEFAULT_SHARING_OPTIONS,
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true },
  );
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = routeParts(url);
  const method = req.method;

  if (method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  if (method === 'GET' && url.pathname === '/api/health') {
    json(res, 200, { success: true, message: 'HostelPay API is running.' });
    return;
  }

  if (parts[0] !== 'api') {
    notFound(res);
    return;
  }

  if (method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !body.password || !body.name || !body.role) {
      json(res, 400, { success: false, message: 'Name, email, password, and role are required.' });
      return;
    }

    if (!['owner', 'tenant'].includes(body.role)) {
      json(res, 400, { success: false, message: 'Role must be owner or tenant.' });
      return;
    }

    if (await findUserByEmail(email)) {
      json(res, 409, { success: false, message: 'Email already registered.' });
      return;
    }

    const ownerSettings = body.role === 'tenant' ? await (await collection('ownerSettings')).findOne({ ownerId: body.ownerId }) : null;
    const tenantRent = body.role === 'tenant' ? getRentForSharing(ownerSettings, body.sharing) : 0;

    if (body.role === 'tenant' && !tenantRent) {
      json(res, 400, { success: false, message: 'Selected sharing type is not available for this hostel.' });
      return;
    }

    const user = {
      ...body,
      id: makeId(body.role),
      email,
      monthlyRent: body.role === 'tenant' ? tenantRent : body.monthlyRent,
      createdAt: new Date().toISOString(),
    };

    if (user.role === 'owner') {
      const owners = await collection('owners');
      const ownerSettingsCollection = await collection('ownerSettings');
      const settings = cleanOwnerSettings({
        hostelName: user.hostelName || '',
        ownerName: user.name,
        upiId: '',
        location: user.location || '',
        qrCode: '',
        sharingOptions: body.sharingOptions,
      });
      await owners.insertOne(user);
      await ownerSettingsCollection.insertOne({
        ownerId: user.id,
        ...settings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const tenants = await collection('tenants');
      const hostel = await getHostel(user.ownerId);
      if (!hostel) {
        json(res, 400, { success: false, message: 'Selected hostel was not found.' });
        return;
      }
      await tenants.insertOne({
        ...user,
        hostelName: user.hostelName || hostel.hostelName,
      });
    }

    json(res, 201, { success: true, user: publicUser(user) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const users = body.role === 'owner' ? await collection('owners') : await collection('tenants');
    const user = await users.findOne({ email, password: body.password, role: body.role });

    if (!user) {
      json(res, 401, { success: false, message: 'Invalid credentials or role mismatch.' });
      return;
    }

    json(res, 200, { success: true, user: sessionUser(user), fullUser: publicUser(user) });
    return;
  }

  if (method === 'GET' && parts[1] === 'users' && parts[2]) {
    const user = await findUserById(parts[2]);
    if (!user) {
      json(res, 404, { success: false, message: 'User not found.' });
      return;
    }
    json(res, 200, { success: true, user: publicUser(user) });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/hostels') {
    const owners = await collection('owners');
    const ownerList = await owners.find({ role: 'owner' }).toArray();
    const hostels = await Promise.all(ownerList.map((owner) => getHostel(owner.id)));
    json(res, 200, { success: true, hostels: hostels.filter(Boolean) });
    return;
  }

  if (method === 'GET' && parts[1] === 'hostels' && parts[2]) {
    const hostel = await getHostel(parts[2]);
    if (!hostel) {
      json(res, 404, { success: false, message: 'Hostel not found.' });
      return;
    }
    json(res, 200, { success: true, hostel });
    return;
  }

  if (method === 'GET' && parts[1] === 'owners' && parts[2] && parts[3] === 'tenants') {
    const tenants = await collection('tenants');
    const tenantList = await tenants.find({ role: 'tenant', ownerId: parts[2] }).toArray();
    json(res, 200, { success: true, tenants: tenantList.map(publicUser) });
    return;
  }

  if (method === 'GET' && parts[1] === 'owners' && parts[2] && parts[3] === 'stats') {
    json(res, 200, { success: true, stats: await getOwnerStats(parts[2]) });
    return;
  }

  if (method === 'GET' && parts[1] === 'owners' && parts[2] && parts[3] === 'settings') {
    const ownerSettings = await collection('ownerSettings');
    const settings = await ownerSettings.findOne({ ownerId: parts[2] });
    json(res, 200, {
      success: true,
      settings: settings ? cleanOwnerSettings(settings) : DEFAULT_OWNER_SETTINGS,
    });
    return;
  }

  if (method === 'PUT' && parts[1] === 'owners' && parts[2] && parts[3] === 'settings') {
    const body = await readBody(req);
    const settings = cleanOwnerSettings(body);
    const ownerSettings = await collection('ownerSettings');
    await ownerSettings.updateOne(
      { ownerId: parts[2] },
      {
        $set: { ...settings, ownerId: parts[2], updatedAt: new Date().toISOString() },
        $setOnInsert: { createdAt: new Date().toISOString() },
      },
      { upsert: true },
    );
    json(res, 200, { success: true, settings });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/payments') {
    const tenantId = url.searchParams.get('tenantId');
    const ownerId = url.searchParams.get('ownerId');
    const payments = await collection('payments');
    const filter = {};

    if (tenantId) {
      filter.tenantId = tenantId;
    }

    if (ownerId) {
      const tenants = await collection('tenants');
      const tenantIds = await tenants.distinct('id', { role: 'tenant', ownerId });
      filter.tenantId = { $in: tenantIds };
    }

    const paymentList = await payments.find(filter).sort({ submittedAt: -1 }).toArray();
    json(res, 200, { success: true, payments: paymentList.map(publicDocument) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/payments') {
    const body = await readBody(req);
    const transactionId = normalizeTransactionId(body.transactionId);

    if (!body.tenantId || !body.month || !body.proofImage || !transactionId) {
      json(res, 400, { success: false, message: 'Tenant, month, payment proof, and transaction ID are required.' });
      return;
    }

    const payments = await collection('payments');
    const tenants = await collection('tenants');
    const tenant = await tenants.findOne({ id: body.tenantId });

    if (!tenant) {
      json(res, 404, { success: false, message: 'Tenant not found.' });
      return;
    }

    const sameHostelTenantIds = await tenants.distinct('id', {
      role: 'tenant',
      ownerId: tenant.ownerId,
    });
    const existingPayment = await payments.findOne({ tenantId: body.tenantId, month: body.month });
    const duplicateTransaction = await payments.findOne({
      tenantId: { $in: sameHostelTenantIds },
      transactionId,
      id: { $ne: existingPayment?.id || '' },
    });
    const suspicious = Boolean(duplicateTransaction);
    const fraudReason = duplicateTransaction ? 'Duplicate transaction ID detected in this hostel.' : '';

    const payment = {
      id: existingPayment?.id || makeId('pay'),
      tenantId: body.tenantId,
      amount: Number(body.amount || 0),
      month: body.month,
      proofImage: body.proofImage,
      transactionId,
      status: suspicious ? 'rejected' : 'pending',
      suspicious,
      fraudReason,
      duplicatePaymentId: duplicateTransaction?.id || '',
      submittedAt: existingPayment?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await payments.replaceOne(
      { tenantId: payment.tenantId, month: payment.month },
      payment,
      { upsert: true },
    );

    json(res, 201, { success: true, payment });
    return;
  }

  if (method === 'PUT' && parts[1] === 'payments' && parts[2] && parts[3] === 'approve') {
    const payments = await collection('payments');
    const payment = await payments.findOne({ id: parts[2] });

    if (!payment) {
      json(res, 404, { success: false, message: 'Payment not found.' });
      return;
    }

    if (payment.suspicious || payment.status === 'rejected') {
      json(res, 400, { success: false, message: 'Fraud detected. This payment cannot be approved or counted as received.' });
      return;
    }

    const updated = await payments.findOneAndUpdate(
      { id: parts[2] },
      {
        $set: {
          status: 'approved',
          suspicious: false,
          approvedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      json(res, 404, { success: false, message: 'Payment not found.' });
      return;
    }

    json(res, 200, { success: true, payment: publicDocument(updated) });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/complaints') {
    const tenantId = url.searchParams.get('tenantId');
    const ownerId = url.searchParams.get('ownerId');
    const complaints = await collection('complaints');
    const filter = {};
    if (tenantId) filter.tenantId = tenantId;
    if (ownerId) filter.ownerId = ownerId;
    const complaintList = await complaints.find(filter).sort({ createdAt: -1 }).toArray();
    json(res, 200, { success: true, complaints: complaintList.map(publicDocument) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/complaints') {
    const body = await readBody(req);
    if (!body.tenantId || !body.ownerId || !body.message) {
      json(res, 400, { success: false, message: 'Tenant, owner, and message are required.' });
      return;
    }
    const complaint = {
      id: makeId('cmp'),
      tenantId: body.tenantId,
      tenantName: body.tenantName || '',
      ownerId: body.ownerId,
      message: body.message,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const complaints = await collection('complaints');
    await complaints.insertOne(complaint);
    json(res, 201, { success: true, complaint });
    return;
  }

  if (method === 'PUT' && parts[1] === 'complaints' && parts[2] && parts[3] === 'resolve') {
    const complaints = await collection('complaints');
    const updated = await complaints.findOneAndUpdate(
      { id: parts[2] },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      json(res, 404, { success: false, message: 'Complaint not found.' });
      return;
    }

    json(res, 200, { success: true, complaint: publicDocument(updated) });
    return;
  }

  if (method === 'GET' && url.pathname === '/api/reminders') {
    const ownerId = url.searchParams.get('ownerId');
    const reminders = await collection('reminders');
    const filter = ownerId ? { ownerId } : {};
    const reminderList = await reminders.find(filter).sort({ sentAt: -1 }).toArray();
    json(res, 200, { success: true, reminders: reminderList.map(publicDocument) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/reminders') {
    const body = await readBody(req);
    if (!body.ownerId || !body.tenantId || !body.message) {
      json(res, 400, { success: false, message: 'Owner, tenant, and message are required.' });
      return;
    }
    const reminder = {
      id: makeId('rem'),
      ownerId: body.ownerId,
      tenantId: body.tenantId,
      tenantName: body.tenantName || '',
      tenantPhone: body.tenantPhone || '',
      message: body.message,
      month: body.month || getCurrentMonth(),
      sentAt: new Date().toISOString(),
    };
    const reminders = await collection('reminders');
    await reminders.insertOne(reminder);
    json(res, 201, { success: true, reminder });
    return;
  }

  notFound(res);
}

try {
  await connectMongo();
  await ensureIndexes();
  await seedDemoData();
} catch (error) {
  console.error('Could not connect to MongoDB Atlas.');
  console.error(error.message);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (error.code === 11000) {
      json(res, 409, { success: false, message: 'Duplicate data already exists.' });
      return;
    }
    json(res, 500, { success: false, message: error.message || 'Internal server error.' });
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. The backend may already be running.`);
    console.error(`Open http://localhost:${PORT}/api/health to check it, or stop the old process before starting again.`);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

async function shutdown() {
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`HostelPay API running at http://localhost:${PORT}`);
  console.log(`MongoDB database: ${MONGODB_DB_NAME}`);
  console.log(`MongoDB collections: ${Object.values(COLLECTIONS).join(', ')}`);
});
