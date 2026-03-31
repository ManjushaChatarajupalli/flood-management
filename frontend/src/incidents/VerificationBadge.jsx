import React from 'react';

const VerificationBadge = ({ verificationScore, autoApproved, warnings = [] }) => {
  const getBadgeStyle = () => {
    if (verificationScore >= 80) {
      return {
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-800',
        icon: '✓',
        label: 'Verified'
      };
    } else if (verificationScore >= 60) {
      return {
        bg: 'bg-yellow-100',
        border: 'border-yellow-500',
        text: 'text-yellow-800',
        icon: '⚠',
        label: 'Needs Review'
      };
    } else {
      return {
        bg: 'bg-red-100',
        border: 'border-red-500',
        text: 'text-red-800',
        icon: '✗',
        label: 'Unverified'
      };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${style.bg} ${style.border} ${style.text}`}>
        <span className="text-lg font-bold">{style.icon}</span>
        <span className="font-semibold">{style.label}</span>
        <span className="text-sm">({verificationScore}%)</span>
      </div>

      {autoApproved && (
        <div className="inline-flex items-center gap-2 ml-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-500 text-blue-800 text-sm">
          🤖 Auto-Approved
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-300 rounded-lg">
          <p className="text-sm font-semibold text-orange-800 mb-2">
            ⚠️ Verification Warnings:
          </p>
          <ul className="text-xs text-orange-700 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VerificationBadge;