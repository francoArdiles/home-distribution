import React from 'react';

const TimeSelector = ({ dateTime, onChange }) => {
  const toDateString = () => {
    const m = String(dateTime.month + 1).padStart(2, '0');
    const d = String(dateTime.day).padStart(2, '0');
    return `${dateTime.year}-${m}-${d}`;
  };

  const handleDateChange = (e) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    onChange({ ...dateTime, year, month: month - 1, day });
  };

  const handleHourChange = (e) => {
    onChange({ ...dateTime, hour: Number(e.target.value) });
  };

  const setPreset = (month, day) => {
    onChange({ ...dateTime, month, day });
  };

  const setNow = () => {
    const now = new Date();
    onChange({
      ...dateTime,
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    });
  };

  return (
    <div>
      <input
        type="date"
        data-testid="date-input"
        value={toDateString()}
        onChange={handleDateChange}
      />
      <div>
        <input
          type="range"
          data-testid="hour-input"
          min="0" max="23" step="1"
          value={dateTime.hour}
          onChange={handleHourChange}
        />
        <span>{String(dateTime.hour).padStart(2, '0')}:00</span>
      </div>
      <div>
        <button onClick={() => setPreset(5, 21)}>Solsticio Verano</button>
        <button onClick={() => setPreset(11, 21)}>Solsticio Invierno</button>
        <button onClick={() => setPreset(2, 21)}>Equinoccio</button>
        <button onClick={setNow}>Ahora</button>
      </div>
    </div>
  );
};

export default TimeSelector;
