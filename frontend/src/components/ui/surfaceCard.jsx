import React from 'react';
import { twMerge } from 'tailwind-merge';

const SurfaceCard = ({
  children,
  className = '',
  withShadow = true,
  padding = 'p-6',
  as: Component = 'div',
}) => {
  return (
    <Component
      className={twMerge(
        'bg-light-card dark:bg-dark-card rounded-2xl ring-1 ring-light-border dark:ring-dark-border',
        withShadow ? 'shadow-card' : '',
        padding,
        className
      )}
    >
      {children}
    </Component>
  );
};

export default SurfaceCard;
