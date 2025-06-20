import React from 'react';

interface LoadingGiphyProps {
  title: string;
  className?: string; // For custom styling of the container
}

export const LoadingGiphy: React.FC<LoadingGiphyProps> = ({ title, className = "w-32 h-32 relative" }) => {
  return (
    <div className={className}>
      <iframe
        src="https://giphy.com/embed/tn3kTJo4P4y1G"
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
        frameBorder="0"
        className="giphy-embed"
        allowFullScreen
        title={title}
      ></iframe>
    </div>
  );
};