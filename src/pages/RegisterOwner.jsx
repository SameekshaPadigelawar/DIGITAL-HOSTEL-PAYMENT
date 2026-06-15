import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { DEFAULT_SHARING_OPTIONS, formatCurrency, registerUser, saveOwnerSettings } from '../services/store';

export default function RegisterOwner() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', hostelName: '', location: '', email: '', phone: '', password: '', confirmPassword: '',
    sharingOptions: DEFAULT_SHARING_OPTIONS.map((option) => ({ ...option })),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const updateSharingOption = (index, field) => (e) => {
    const sharingOptions = form.sharingOptions.map((option, optionIndex) => (
      optionIndex === index ? { ...option, [field]: e.target.value } : option
    ));
    setForm({ ...form, sharingOptions });
  };
  const addSharingOption = () => {
    const nextNumber = form.sharingOptions.length + 1;
    setForm({
      ...form,
      sharingOptions: [
        ...form.sharingOptions,
        { sharing: `${nextNumber}_sharing`, label: `${nextNumber} Sharing`, rent: '' },
      ],
    });
  };
  const removeSharingOption = (index) => {
    setForm({
      ...form,
      sharingOptions: form.sharingOptions.filter((_, optionIndex) => optionIndex !== index),
    });
  };
  const cleanSharingOptions = () => form.sharingOptions
    .map((option) => ({
      sharing: String(option.sharing || option.label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      label: String(option.label || '').trim(),
      rent: Number(option.rent || 0),
    }))
    .filter((option) => option.sharing && option.label && option.rent > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const sharingOptions = cleanSharingOptions();
    if (sharingOptions.length === 0) {
      setError('Add at least one sharing type with rent.');
      return;
    }

    const result = await registerUser({
      role: 'owner',
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      hostelName: form.hostelName.trim(),
      location: form.location.trim(),
      sharingOptions,
    });

    if (result.success) {
      await saveOwnerSettings(result.user.id, {
        hostelName: form.hostelName.trim(),
        ownerName: form.name.trim(),
        upiId: '',
        location: form.location.trim(),
        qrCode: '',
        sharingOptions,
      });
      setError('');
      setSuccess(`${form.hostelName.trim()} registered! Tenants can now select your hostel. Redirecting...`);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(result.message);
      setSuccess('');
    }
  };

  return (
    <>
      <Navbar minimal />
      <div className="auth-page auth-page-register">
        <div className="register-layout">
          <div className="register-summary">
            <span className="role-badge role-owner">Owner Registration</span>
            <h1>List your hostel</h1>
            <p>
              Register your PG or hostel so tenants can find and join it.
              Manage payments, send reminders, and track dues from one dashboard.
            </p>
            {form.hostelName && (
              <div className="selected-hostel-preview">
                <span className="preview-label">Your hostel</span>
                <h3>{form.hostelName}</h3>
                <p>{form.location || 'Add location in the form'}</p>
              </div>
            )}
            <ul className="auth-benefits">
              <li>Tenants register under your hostel name</li>
              <li>Upload UPI QR for easy payments</li>
              <li>Track revenue & defaulters live</li>
            </ul>
          </div>

          <div className="auth-card register-form-card">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-step">1</span>
                  <div>
                    <h3>Hostel Details</h3>
                    <p>This name will appear when tenants sign up</p>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="hostelName">Hostel / PG Name</label>
                  <input id="hostelName" value={form.hostelName} onChange={update('hostelName')} placeholder="Sunrise PG Hostel" required />
                </div>
                <div className="form-group">
                  <label htmlFor="location">Hostel Location</label>
                  <input id="location" value={form.location} onChange={update('location')} placeholder="Koramangala, Bangalore" required />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-step">2</span>
                  <div>
                    <h3>Sharing & Rent</h3>
                    <p>Add the room types tenants can choose</p>
                  </div>
                </div>
                <div className="sharing-options-list">
                  {form.sharingOptions.map((option, index) => (
                    <div className="sharing-option-row" key={`${option.sharing}-${index}`}>
                      <div className="form-group">
                        <label htmlFor={`sharingLabel-${index}`}>Sharing Type</label>
                        <input
                          id={`sharingLabel-${index}`}
                          value={option.label}
                          onChange={updateSharingOption(index, 'label')}
                          placeholder="e.g. 5 Sharing"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`sharingRent-${index}`}>Monthly Rent</label>
                        <input
                          id={`sharingRent-${index}`}
                          type="number"
                          min="1"
                          value={option.rent}
                          onChange={updateSharingOption(index, 'rent')}
                          placeholder="Rent"
                          required
                        />
                        {Number(option.rent) > 0 && <p className="form-hint">{formatCurrency(option.rent)} per month</p>}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => removeSharingOption(index)}
                        disabled={form.sharingOptions.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addSharingOption}>
                  Add Sharing Type
                </button>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-step">3</span>
                  <div>
                    <h3>Owner Details</h3>
                    <p>Your personal contact information</p>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="name">Your Full Name</label>
                  <input id="name" value={form.name} onChange={update('name')} placeholder="Rajesh Kumar" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input id="email" type="email" value={form.email} onChange={update('email')} placeholder="owner@email.com" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="9876543210" required />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-step">4</span>
                  <div>
                    <h3>Create Account</h3>
                    <p>Set your login password</p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" value={form.password} onChange={update('password')} placeholder="Create password" required minLength={6} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm password" required />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg">
                Register {form.hostelName || 'Hostel'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign In</Link></p>
              <p>Are you a tenant? <Link to="/register/tenant">Register here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
