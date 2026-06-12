import React from 'react';
import { categoryColor } from '../utils/messageFormat';

/** Small colored pill showing a message/broadcast category (GENERAL, URGENT, …). */
export default function CategoryBadge({ category, withBorder = false, style }) {
  const colors = categoryColor(category);
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 10,
      background: colors.bg,
      color: colors.color,
      ...(withBorder ? { border: `1px solid ${colors.border}` } : {}),
      ...style,
    }}>
      {category}
    </span>
  );
}
