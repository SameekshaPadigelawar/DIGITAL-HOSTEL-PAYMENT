import { Icons } from './Icons';

export default function HostelPicker({ hostels, selectedId, onSelect, error }) {
  if (hostels.length === 0) {
    return (
      <div className="hostel-empty">
        <Icons.Building size={32} />
        <p>No hostels registered yet. Ask your owner to sign up first.</p>
      </div>
    );
  }

  return (
    <div className="hostel-picker">
      {error && <p className="form-error">{error}</p>}
      <div className="hostel-grid">
        {hostels.map((hostel) => {
          const selected = selectedId === hostel.ownerId;
          return (
            <button
              key={hostel.ownerId}
              type="button"
              className={`hostel-card ${selected ? 'selected' : ''}`}
              onClick={() => onSelect(hostel.ownerId)}
            >
              <div className="hostel-card-icon">
                <Icons.Building size={20} />
              </div>
              <div className="hostel-card-body">
                <h4>{hostel.hostelName}</h4>
                <p>{hostel.location || 'Location not set'}</p>
                <span className="hostel-owner">Managed by {hostel.ownerName}</span>
              </div>
              {selected && (
                <div className="hostel-check">
                  <Icons.Check size={14} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
