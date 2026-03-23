import React from 'react';

export default function ActiveUsers({ users, currentUserId }) {
  if (!users?.length) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {users.slice(0, 6).map((u) => (
        <div
          key={u.userId}
          title={u.userId === currentUserId ? `${u.username} (you)` : u.username}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: u.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            border: u.userId === currentUserId ? '2px solid #444' : '2px solid #fff',
            cursor: 'default',
            flexShrink: 0,
          }}
        >
          {u.username[0].toUpperCase()}
        </div>
      ))}
      {users.length > 6 && (
        <span style={{ fontSize: 12, color: '#666' }}>+{users.length - 6}</span>
      )}
    </div>
  );
}
