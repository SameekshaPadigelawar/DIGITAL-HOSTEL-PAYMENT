import { useState, useEffect } from 'react';
import { recognize } from 'tesseract.js';
import DashboardLayout from '../components/DashboardLayout';
import { Icons } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import {
  getUserById,
  getOwnerSettings,
  getHostelByOwnerId,
  getPayments,
  getComplaints,
  savePayment,
  saveComplaint,
  getCurrentMonth,
  formatMonth,
  formatCurrency,
  getSharingLabel,
} from '../services/store';

const NAV = [
  { id: 'pay', label: 'Pay Rent', icon: Icons.Card },
  { id: 'complaints', label: 'Complaints', icon: Icons.Message },
  { id: 'profile', label: 'My Profile', icon: Icons.User },
];

export default function TenantDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pay');
  const [profile, setProfile] = useState(null);
  const [ownerSettings, setOwnerSettings] = useState({});
  const [preview, setPreview] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [extractingId, setExtractingId] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [hostel, setHostel] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  const month = getCurrentMonth();

  useEffect(() => {
    async function loadDashboard() {
      const full = await getUserById(user.id);
      const tenantComplaints = await getComplaints({ tenantId: user.id });
      const tenantPayments = await getPayments({ tenantId: user.id });

    setProfile(full);
    if (full?.ownerId) {
        const [settings, hostelInfo] = await Promise.all([
          getOwnerSettings(full.ownerId),
          getHostelByOwnerId(full.ownerId),
        ]);
        setOwnerSettings(settings);
        setHostel(hostelInfo);
    }
      setComplaints(tenantComplaints);
      setCurrentPayment(tenantPayments.find((p) => p.month === month) || null);
    }

    loadDashboard();
  }, [user.id]);

  const hostelName = profile?.hostelName || hostel?.hostelName || 'Your Hostel';

  const extractTransactionIdFromText = (text) => {
    const compactText = text
      .toUpperCase()
      .replace(/[|]/g, 'I')
      .replace(/\s+/g, ' ');

    const candidatePatterns = [
      /UPI\s*(?:TRANSACTION)?\s*(?:ID|NO|NUMBER)?\s*[:#-]?\s*([0-9]{8,20})/i,
      /(?:TRANSACTION|TXN)\s*(?:ID|NO|NUMBER)?\s*[:#-]?\s*([A-Z0-9]{8,22})/i,
      /UTR\s*(?:ID|NO|NUMBER)?\s*[:#-]?\s*([A-Z0-9]{8,22})/i,
      /(?:REFERENCE|REF)\s*(?:ID|NO|NUMBER)?\s*[:#-]?\s*([A-Z0-9]{8,22})/i,
    ];

    for (const pattern of candidatePatterns) {
      const match = compactText.match(pattern);
      const candidate = match?.[1]?.replace(/[^A-Z0-9]/g, '');
      if (candidate && /\d/.test(candidate) && !['TRANSACTION', 'REFERENCE'].includes(candidate)) {
        return candidate;
      }
    }

    const longIdMatch = compactText.match(/\b[A-Z0-9]{10,22}\b/i);
    const fallback = longIdMatch?.[0]?.replace(/[^A-Z0-9]/g, '') || '';
    return /\d/.test(fallback) && !['TRANSACTION', 'REFERENCE'].includes(fallback) ? fallback : '';
  };

  const tryExtractTransactionId = async (file) => {
    setExtractingId(true);
    try {
      const result = await recognize(file, 'eng');
      return extractTransactionIdFromText(result.data.text || '');
    } catch {
      setUploadError('Could not read the transaction ID automatically. Please enter it manually.');
      return '';
    } finally {
      setExtractingId(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    const extractedId = await tryExtractTransactionId(file);
    if (extractedId) setTransactionId(extractedId);
    setUploadMsg('');
    setUploadError('');
  };

  const submitPayment = async () => {
    if (!preview) {
      setUploadError('Please upload a payment screenshot first.');
      return;
    }

    if (!transactionId.trim()) {
      setUploadError('Please enter the transaction ID from your payment screenshot.');
      return;
    }

    const payment = {
      tenantId: user.id,
      amount: profile?.monthlyRent || 0,
      month,
      proofImage: preview,
      transactionId,
    };

    const result = await savePayment(payment);

    if (!result.success) {
      setUploadError(result.message);
      return;
    }

    setCurrentPayment(result.payment);

    if (result.payment.suspicious) {
      setUploadError(`${result.payment.fraudReason || 'Possible duplicate payment detected.'} Owner has been notified for review.`);
    } else {
      setUploadMsg('Payment proof uploaded successfully! Awaiting owner approval.');
    }
    setPreview('');
    setTransactionId('');
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    const complaint = {
      tenantId: user.id,
      tenantName: user.name,
      ownerId: profile?.ownerId,
      message: complaintText.trim(),
    };

    const result = await saveComplaint(complaint);
    if (result.success) {
      setComplaints([result.complaint, ...complaints]);
    }
    setComplaintText('');
  };

  const titles = {
    pay: 'Pay Monthly Rent',
    complaints: 'Raise a Complaint',
    profile: 'My Profile',
  };

  return (
    <DashboardLayout
      title={titles[tab]}
      subtitle={
        tab === 'pay'
          ? `${hostelName} · Payment for ${formatMonth(month)}`
          : tab === 'profile'
            ? hostelName
            : undefined
      }
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      {hostel && (
        <div className="hostel-banner">
          <div className="hostel-banner-icon"><Icons.Building size={22} /></div>
          <div>
            <span className="hostel-banner-label">Your Hostel</span>
            <h3>{hostelName}</h3>
            <p>{hostel.location || '—'} · Managed by {hostel.ownerName}</p>
          </div>
        </div>
      )}

      {tab === 'pay' && profile && (
        <>
          <div className="rent-info-card">
            <h3>Your Monthly Rent — {formatMonth(month)}</h3>
            <div className="amount">{formatCurrency(profile.monthlyRent)}</div>
            {currentPayment && (
              <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
                Status: {currentPayment.suspicious ? 'Under review — duplicate detected' : currentPayment.status}
              </p>
            )}
          </div>

          <div className="qr-section">
            <div className="panel">
              <div className="panel-header"><h2>Scan & Pay via UPI</h2></div>
              <div className="panel-body">
                <div className="qr-display">
                  {ownerSettings.qrCode ? (
                    <img src={ownerSettings.qrCode} alt="Payment QR Code" />
                  ) : (
                    <div className="qr-placeholder">QR code not uploaded by owner</div>
                  )}
                  <div className="upi-info">
                    <p><strong>Hostel:</strong> {ownerSettings.hostelName || '—'}</p>
                    <p><strong>UPI ID:</strong> {ownerSettings.upiId || '—'}</p>
                    <p><strong>Location:</strong> {ownerSettings.location || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><h2>Upload Payment Proof</h2></div>
              <div className="panel-body">
                {uploadMsg && <div className="alert alert-success">{uploadMsg}</div>}
                {uploadError && <div className="alert alert-warning">{uploadError}</div>}

                <label className="upload-zone">
                  <input type="file" accept="image/*" onChange={handleFileSelect} />
                  <div className="upload-icon"><Icons.Upload size={28} /></div>
                  <p><strong>Click to upload</strong> payment screenshot</p>
                  <p className="form-hint">PNG, JPG up to 5MB</p>
                </label>

                {preview && (
                  <div className="upload-preview">
                    <img src={preview} alt="Payment preview" />
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="transactionId">Transaction ID / UTR</label>
                  <input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                    placeholder={extractingId ? 'Extracting from screenshot...' : 'Enter transaction ID from screenshot'}
                    required
                  />
                  <p className="form-hint">
                    {extractingId
                      ? 'Reading the screenshot with OCR. This can take a few seconds.'
                      : 'Confirm the ID so duplicate payments can be detected.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  style={{ marginTop: '1rem' }}
                  onClick={submitPayment}
                  disabled={!!currentPayment && currentPayment.status === 'approved'}
                >
                  {currentPayment?.status === 'approved' ? 'Payment Approved' : 'Submit Payment Proof'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'complaints' && (
        <>
          <div className="panel">
            <div className="panel-header"><h2>Report an Issue</h2></div>
            <div className="panel-body">
              <form onSubmit={submitComplaint}>
                <div className="form-group">
                  <label htmlFor="complaint">Describe your issue</label>
                  <textarea
                    id="complaint"
                    rows={4}
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder="e.g. Water leakage in bathroom, WiFi not working..."
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">Submit Complaint</button>
              </form>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Your Complaints</h2></div>
            <div className="panel-body">
              {complaints.length === 0 ? (
                <div className="empty-state">
                  <p>No complaints submitted yet.</p>
                </div>
              ) : (
                complaints.map((c) => (
                  <div key={c.id} className="complaint-card">
                    <div className="complaint-meta">
                      <span className={`status status-${c.status === 'open' ? 'pending' : 'paid'} complaint-status`}>
                        {c.status}
                      </span>
                      <span>{new Date(c.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p>{c.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'profile' && profile && (
        <div className="panel">
          <div className="panel-header"><h2>Your Details</h2></div>
          <div className="panel-body">
            <div className="table-wrapper">
              <table className="data-table">
                <tbody>
                  <tr><th>Hostel</th><td><strong>{hostelName}</strong></td></tr>
                  <tr><th>Name</th><td>{profile.name}</td></tr>
                  <tr><th>Email</th><td>{profile.email}</td></tr>
                  <tr><th>Phone</th><td>{profile.phone}</td></tr>
                  <tr><th>Address</th><td>{profile.address}</td></tr>
                  <tr><th>Floor</th><td>{profile.floor}</td></tr>
                  <tr><th>Room Number</th><td>{profile.roomNumber}</td></tr>
                  <tr><th>Sharing Type</th><td>{getSharingLabel(profile.sharing, hostel?.sharingOptions || [])}</td></tr>
                  <tr><th>Occupation</th><td>{profile.occupation === 'student' ? 'Student' : 'Working Professional'}</td></tr>
                  <tr><th>Monthly Rent</th><td>{formatCurrency(profile.monthlyRent)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
