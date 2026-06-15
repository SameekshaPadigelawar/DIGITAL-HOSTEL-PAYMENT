import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HostelPicker from '../components/HostelPicker';
import {
  registerUser,
  getAvailableHostels,
  getHostelByOwnerId,
  formatCurrency,
} from '../services/store';

export default function RegisterTenant() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);

  const [form, setForm] = useState({
    ownerId: hostels[0]?.ownerId || '',
    name: '',
    email: '',
    phone: '',
    address: '',
    floor: '',
    roomNumber: '',
    sharing: '',
    occupation: 'student',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hostelError, setHostelError] = useState('');

  const selectedHostel = hostels.find((hostel) => hostel.ownerId === form.ownerId);
  const sharingOptions = selectedHostel?.sharingOptions || [];
  const selectedSharingOption = sharingOptions.find((option) => option.sharing === form.sharing);
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => {
    async function loadHostels() {
      const availableHostels = await getAvailableHostels();
      setHostels(availableHostels);
      if (!form.ownerId && availableHostels[0]?.ownerId) {
        setForm((current) => ({
          ...current,
          ownerId: availableHostels[0].ownerId,
          sharing: availableHostels[0].sharingOptions?.[0]?.sharing || '',
        }));
      }
    }

    loadHostels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHostelError('');

    if (!form.ownerId) {
      setHostelError('Please select a hostel to continue.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const hostel = await getHostelByOwnerId(form.ownerId);
    const selectedOption = hostel?.sharingOptions?.find((option) => option.sharing === form.sharing);
    if (!selectedOption) {
      setError('Please select an available sharing type for this hostel.');
      return;
    }

    const result = await registerUser({
      role: 'tenant',
      ownerId: form.ownerId,
      hostelName: hostel?.hostelName || '',
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      address: form.address.trim(),
      floor: form.floor.trim(),
      roomNumber: form.roomNumber.trim(),
      sharing: form.sharing,
      occupation: form.occupation,
      monthlyRent: selectedOption.rent,
    });

    if (result.success) {
      setError('');
      setSuccess(`Welcome to ${hostel?.hostelName}! Redirecting to login...`);
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
            <span className="role-badge role-tenant">Tenant Registration</span>
            <h1>Join your hostel</h1>
            <p>Select your hostel, enter room details, and start managing rent payments digitally.</p>

            {selectedHostel && (
              <div className="selected-hostel-preview">
                <span className="preview-label">Selected hostel</span>
                <h3>{selectedHostel.hostelName}</h3>
                <p>{selectedHostel.location || 'Location not set'}</p>
                <p className="preview-rent">
                  Est. rent: <strong>{formatCurrency(selectedSharingOption?.rent || 0)}</strong>/mo
                </p>
              </div>
            )}

            <ul className="auth-benefits">
              <li>Linked to your hostel automatically</li>
              <li>Scan QR & upload payment proof</li>
              <li>Raise complaints from your dashboard</li>
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
                    <h3>Select Your Hostel</h3>
                    <p>Choose the hostel you are staying in</p>
                  </div>
                </div>
                <HostelPicker
                  hostels={hostels}
                  selectedId={form.ownerId}
                  onSelect={(id) => {
                    const hostel = hostels.find((item) => item.ownerId === id);
                    setForm({
                      ...form,
                      ownerId: id,
                      sharing: hostel?.sharingOptions?.[0]?.sharing || '',
                    });
                  }}
                  error={hostelError}
                />
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-step">2</span>
                  <div>
                    <h3>Personal Details</h3>
                    <p>Your contact information</p>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input id="name" value={form.name} onChange={update('name')} placeholder="Priya Sharma" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input id="email" type="email" value={form.email} onChange={update('email')} placeholder="you@email.com" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="9123456780" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="address">Home Address</label>
                  <input id="address" value={form.address} onChange={update('address')} placeholder="City, State" required />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <span className="form-step">3</span>
                  <div>
                    <h3>Room Details</h3>
                    <p>Floor, room & sharing type</p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="floor">Floor Number</label>
                    <input id="floor" value={form.floor} onChange={update('floor')} placeholder="e.g. 2" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="roomNumber">Room Number</label>
                    <input id="roomNumber" value={form.roomNumber} onChange={update('roomNumber')} placeholder="e.g. 201" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="sharing">Room Sharing Type</label>
                    <select id="sharing" value={form.sharing} onChange={update('sharing')} required>
                      {sharingOptions.map((option) => (
                        <option key={option.sharing} value={option.sharing}>
                          {option.label} - {formatCurrency(option.rent)}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      Monthly rent: <strong>{formatCurrency(selectedSharingOption?.rent || 0)}</strong>
                    </p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="occupation">Occupation</label>
                    <select id="occupation" value={form.occupation} onChange={update('occupation')} required>
                      <option value="student">Student</option>
                      <option value="working">Working Professional</option>
                    </select>
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
                Register at {selectedHostel?.hostelName || 'Hostel'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign In</Link></p>
              <p>Are you a hostel owner? <Link to="/register/owner">Register here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
