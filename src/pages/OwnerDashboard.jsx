import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import { Icons } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import {
  getTenantsForOwner,
  getOwnerStats,
  getPayments,
  approvePayment as approvePaymentApi,
  getComplaints,
  resolveComplaint as resolveComplaintApi,
  getOwnerSettings,
  saveOwnerSettings,
  getReminders,
  saveReminder,
  getCurrentMonth,
  formatMonth,
  formatCurrency,
  getSharingLabel,
  DEFAULT_SHARING_OPTIONS,
} from '../services/store';

const NAV = [
  { id: 'overview', label: 'Overview', icon: Icons.Chart },
  { id: 'tenants', label: 'Tenants', icon: Icons.Users },
  { id: 'payments', label: 'Payments', icon: Icons.Card },
  { id: 'complaints', label: 'Complaints', icon: Icons.Message },
  { id: 'reminders', label: 'Reminders', icon: Icons.Bell },
  { id: 'settings', label: 'Settings', icon: Icons.Settings },
];

function StatusBadge({ status }) {
  const map = {
    approved: 'paid',
    pending: 'pending',
    rejected: 'overdue',
    suspicious: 'suspicious',
    open: 'pending',
    resolved: 'paid',
  };
  return <span className={`status status-${map[status] || 'pending'}`}>{status}</span>;
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [settings, setSettings] = useState({});
  const [reminders, setReminders] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');

  const month = getCurrentMonth();
  const refresh = async () => {
    const [nextStats, nextTenants, nextPayments, nextComplaints, nextSettings, nextReminders] = await Promise.all([
      getOwnerStats(user.id),
      getTenantsForOwner(user.id),
      getPayments({ ownerId: user.id }),
      getComplaints({ ownerId: user.id }),
      getOwnerSettings(user.id),
      getReminders({ ownerId: user.id }),
    ]);

    setStats(nextStats);
    setTenants(nextTenants);
    setPayments(nextPayments);
    setComplaints(nextComplaints);
    setSettings(nextSettings);
    setReminders(nextReminders);
  };

  useEffect(() => { refresh(); }, [user.id]);

  const approvePayment = async (paymentId) => {
    await approvePaymentApi(paymentId);
    await refresh();
  };

  const resolveComplaint = async (complaintId) => {
    await resolveComplaintApi(complaintId);
    await refresh();
  };

  const sendReminder = async (tenant) => {
    const reminder = {
      ownerId: user.id,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      message: `Reminder: Please pay your rent of ${formatCurrency(tenant.monthlyRent)} for ${formatMonth(month)}.`,
      sentAt: new Date().toISOString(),
      month,
    };
    await saveReminder(reminder);
    await refresh();
    alert(`Reminder sent to ${tenant.name} (${tenant.phone})`);
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    await saveOwnerSettings(user.id, settings);
    setSaveMsg('Settings saved successfully!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const sharingOptions = settings.sharingOptions?.length ? settings.sharingOptions : DEFAULT_SHARING_OPTIONS;
  const updateSharingOption = (index, field) => (value) => {
    const nextOptions = sharingOptions.map((option, optionIndex) => (
      optionIndex === index ? { ...option, [field]: value } : option
    ));
    setSettings({ ...settings, sharingOptions: nextOptions });
  };
  const addSharingOption = () => {
    const nextNumber = sharingOptions.length + 1;
    setSettings({
      ...settings,
      sharingOptions: [
        ...sharingOptions,
        { sharing: `${nextNumber}_sharing`, label: `${nextNumber} Sharing`, rent: '' },
      ],
    });
  };
  const removeSharingOption = (index) => {
    setSettings({
      ...settings,
      sharingOptions: sharingOptions.filter((_, optionIndex) => optionIndex !== index),
    });
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({ ...settings, qrCode: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const titles = {
    overview: 'Dashboard Overview',
    tenants: 'All Tenants',
    payments: 'Payment Statistics',
    complaints: 'Tenant Complaints',
    reminders: 'Send Reminders',
    settings: 'Hostel Settings',
  };

  return (
    <DashboardLayout
      title={titles[tab]}
      subtitle={tab === 'overview' ? `Financial summary for ${formatMonth(month)}` : undefined}
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'overview' && stats && (
        <>
          <div className="stats-grid">
            <StatCard label="Expected Revenue" value={formatCurrency(stats.expectedRevenue)} icon={<Icons.Wallet size={20} />} variant="revenue" />
            <StatCard label="Received" value={formatCurrency(stats.received)} icon={<Icons.Check size={20} />} variant="received" />
            <StatCard label="Pending Dues" value={formatCurrency(stats.pending)} icon={<Icons.Clock size={20} />} variant="pending" />
            <StatCard label="Defaulters" value={stats.defaulterCount} icon={<Icons.Alert size={20} />} variant="defaulters" />
            <StatCard label="Fraud Alerts" value={stats.suspiciousPaymentCount || 0} icon={<Icons.Alert size={20} />} variant="defaulters" />
          </div>

          <div className="panel">
            <div className="panel-header"><h2>Defaulters This Month</h2></div>
            <div className="panel-body">
              {stats.defaulters.length === 0 ? (
                <div className="empty-state">
                  <p>All tenants have paid for this month.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Room</th>
                        <th>Phone</th>
                        <th>Rent Due</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.defaulters.map((t) => (
                        <tr key={t.id}>
                          <td>{t.name}</td>
                          <td>Floor {t.floor}, Room {t.roomNumber}</td>
                          <td>{t.phone}</td>
                          <td>{formatCurrency(t.monthlyRent)}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => sendReminder(t)}>
                              Send Reminder
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'tenants' && (
        <div className="panel">
          <div className="panel-header">
            <h2>Registered Tenants ({tenants.length})</h2>
          </div>
          <div className="panel-body">
            {tenants.length === 0 ? (
              <div className="empty-state">
                <p>No tenants registered yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hostel</th>
                      <th>Phone</th>
                      <th>Floor / Room</th>
                      <th>Sharing</th>
                      <th>Occupation</th>
                      <th>Monthly Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td>{t.hostelName || '—'}</td>
                        <td>{t.phone}</td>
                        <td>Floor {t.floor}, Room {t.roomNumber}</td>
                        <td>{getSharingLabel(t.sharing, sharingOptions)}</td>
                        <td>{t.occupation === 'student' ? 'Student' : 'Working Professional'}</td>
                        <td>{formatCurrency(t.monthlyRent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="panel">
          <div className="panel-header">
            <h2>All Payments — {formatMonth(month)}</h2>
          </div>
          <div className="panel-body">
            {payments.length === 0 ? (
              <div className="empty-state">
                <p>No payment submissions yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Amount</th>
                      <th>Month</th>
                      <th>Status</th>
                      <th>Transaction ID</th>
                      <th>Submitted</th>
                      <th>Proof</th>
                      <th>Contact</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const tenant = tenants.find((t) => t.id === p.tenantId);
                      return (
                        <tr key={p.id}>
                          <td>{tenant?.name || 'Unknown'}</td>
                          <td>{formatCurrency(p.amount)}</td>
                          <td>{formatMonth(p.month)}</td>
                          <td>
                            <StatusBadge status={p.suspicious ? 'suspicious' : p.status} />
                            {p.suspicious && (
                              <span className="form-hint"> {p.fraudReason || 'Possible fraud detected'}</span>
                            )}
                          </td>
                          <td>{p.transactionId || '-'}</td>
                          <td>{new Date(p.submittedAt).toLocaleDateString('en-IN')}</td>
                          <td>
                            {p.proofImage && (
                              <img src={p.proofImage} alt="Proof" style={{ width: 48, borderRadius: 4 }} />
                            )}
                          </td>
                          <td>
                            <div>{tenant?.phone || '-'}</div>
                            <div className="form-hint">{tenant?.email || ''}</div>
                          </td>
                          <td>
                            {p.status === 'pending' && !p.suspicious && (
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => approvePayment(p.id)}>
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'complaints' && (
        <div className="panel">
          <div className="panel-header">
            <h2>Tenant Complaints ({complaints.length})</h2>
          </div>
          <div className="panel-body">
            {complaints.length === 0 ? (
              <div className="empty-state">
                <p>No complaints submitted yet.</p>
              </div>
            ) : (
              complaints.map((c) => {
                const tenant = tenants.find((t) => t.id === c.tenantId);
                return (
                  <div key={c.id} className="complaint-card">
                    <div className="complaint-meta">
                      <span>
                        {c.tenantName || tenant?.name || 'Unknown tenant'}
                        {tenant?.roomNumber ? ` - Room ${tenant.roomNumber}` : ''}
                      </span>
                      <span>{new Date(c.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="complaint-meta">
                      <StatusBadge status={c.status} />
                      {tenant?.phone && <span>{tenant.phone}</span>}
                    </div>
                    <p>{c.message}</p>
                    {c.status !== 'resolved' ? (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => resolveComplaint(c.id)}>
                        Mark Resolved
                      </button>
                    ) : (
                      <p className="form-hint">
                        Resolved {c.resolvedAt ? new Date(c.resolvedAt).toLocaleString('en-IN') : ''}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'reminders' && (
        <>
          <div className="panel">
            <div className="panel-header"><h2>Send Payment Reminders</h2></div>
            <div className="panel-body">
              {!stats ? (
                <div className="empty-state">
                  <p>Loading reminders...</p>
                </div>
              ) : stats.defaulters.length === 0 ? (
                <div className="empty-state">
                  <p>No pending reminders — all tenants have paid.</p>
                </div>
              ) : (
                stats.defaulters.map((t) => (
                  <div key={t.id} className="reminder-item">
                    <div className="tenant-info">
                      <h4>{t.name}</h4>
                      <p>Floor {t.floor}, Room {t.roomNumber} · {t.phone} · Due: {formatCurrency(t.monthlyRent)}</p>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => sendReminder(t)}>
                      Send Reminder
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {reminders.length > 0 && (
            <div className="panel">
              <div className="panel-header"><h2>Sent Reminders</h2></div>
              <div className="panel-body">
                {reminders.map((r) => (
                  <div key={r.id} className="complaint-card">
                    <div className="complaint-meta">
                      <span>{r.tenantName} — {r.tenantPhone}</span>
                      <span>{new Date(r.sentAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p>{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (
        <div className="panel">
          <div className="panel-header"><h2>Hostel & Payment Settings</h2></div>
          <div className="panel-body">
            {saveMsg && <div className="alert alert-success">{saveMsg}</div>}
            <form onSubmit={handleSettingsSave} className="settings-grid">
              <div>
                <div className="form-group">
                  <label htmlFor="hostelName">Hostel Name</label>
                  <input
                    id="hostelName"
                    value={settings.hostelName || ''}
                    onChange={(e) => setSettings({ ...settings, hostelName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ownerName">Owner Name</label>
                  <input
                    id="ownerName"
                    value={settings.ownerName || ''}
                    onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Hostel Location</label>
                  <input
                    id="location"
                    value={settings.location || ''}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="upiId">UPI ID</label>
                  <input
                    id="upiId"
                    value={settings.upiId || ''}
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    placeholder="yourname@upi"
                  />
                </div>
              </div>
              <div>
                <div className="form-group">
                  <label>Payment QR Code</label>
                  {settings.qrCode ? (
                    <img src={settings.qrCode} alt="QR Code" className="qr-upload-preview" />
                  ) : (
                    <div className="qr-placeholder" style={{ width: 180, height: 180 }}>No QR uploaded</div>
                  )}
                  <input type="file" accept="image/*" onChange={handleQrUpload} style={{ marginTop: '1rem' }} />
                  <p className="form-hint">Upload your UPI QR code image for tenants to scan and pay.</p>
                </div>
                <div className="form-group">
                  <label>Sharing Types & Rent</label>
                  <div className="sharing-options-list">
                    {sharingOptions.map((option, index) => (
                      <div className="sharing-option-row" key={`${option.sharing}-${index}`}>
                        <input
                          value={option.label || ''}
                          onChange={(e) => updateSharingOption(index, 'label')(e.target.value)}
                          placeholder="e.g. 5 Sharing"
                          required
                        />
                        <input
                          type="number"
                          min="1"
                          value={option.rent || ''}
                          onChange={(e) => updateSharingOption(index, 'rent')(e.target.value)}
                          placeholder="Rent"
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => removeSharingOption(index)}
                          disabled={sharingOptions.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addSharingOption}>
                    Add Sharing Type
                  </button>
                  <p className="form-hint">Tenants will only see these options while registering.</p>
                </div>
              </div>
              <div className="settings-actions">
                <button type="submit" className="btn btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
