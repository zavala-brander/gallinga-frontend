"use client";
import React, { useState } from 'react';
import { StarIcon } from '@/components/ui/icons';

interface StarRatingProps {
  totalStars?: number;
  rating: number; // Current rating, controlled by parent
  onRate: (rating: number) => void; // Callback when a new rating is set
  size?: number; // Tailwind size unit (e.g., 5 for h-5 w-5)
  readonly?: boolean;
  className?: string;
  filledStarClasses?: string;
  emptyStarClasses?: string;
  showRatingCount?: boolean;
  ratingCount?: number;
  ratingCountClasses?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  totalStars = 5,
  rating,
  onRate,
  size = 5,
  readonly = false,
  className = '',
  filledStarClasses = 'text-slate-50 dark:text-slate-50 fill-slate-50 dark:fill-slate-50 ', // Default filled colors
  emptyStarClasses = 'text-slate-600/40 dark:text-slate-600/40 fill-slate-600/40 <dark:fill-slate-6></dark:fill-slate-6>00/40', // Default empty colors
  showRatingCount = false,
  ratingCount = 0,
  ratingCountClasses = 'text-xs text-slate-500 dark:text-slate-400 ml-2', // Default classes for count
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseOver = (rate: number) => {
    if (readonly) return;
    setHoverRating(rate);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const handleClick = (rate: number) => {
    if (readonly) return;
    onRate(rate);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex"> {/* Contenedor para las estrellas */}
        {[...Array(totalStars)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = (hoverRating || rating) >= starValue;
          return (
            <button
              key={starValue} type="button"
              className={`p-0.5 ${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none transition-transform duration-150 ease-in-out`}
              onClick={() => handleClick(starValue)} onMouseOver={() => handleMouseOver(starValue)} onMouseLeave={handleMouseLeave} disabled={readonly} aria-label={`Rate ${starValue} out of ${totalStars} stars`}
            ><StarIcon className={`h-${size} w-${size} ${isFilled ? filledStarClasses : emptyStarClasses} ${!readonly && hoverRating >= starValue && hoverRating !== 0 ? 'transform scale-125 opacity-100' : ''} ${!readonly && rating >= starValue && hoverRating === 0 ? 'opacity-100' : ''} ${!readonly && !isFilled ? 'opacity-60 hover:opacity-100' : ''}`} /></button>
          );
        })}
      </div>
      {showRatingCount && (
        <span className={ratingCountClasses}>
          ({ratingCount} {ratingCount === 1 ? 'voto' : 'votos'})
        </span>
      )}
    </div>
  );
};