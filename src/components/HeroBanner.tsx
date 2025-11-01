
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const HeroBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem("heroBannerDismissed");
    if (!bannerDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("heroBannerDismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-secondary text-secondary-foreground p-2 text-center">
      <span>
        Notice: This site is currently under development. Some features issues
        may arise.
      </span>
      <button onClick={handleDismiss} className="absolute right-2 top-2">
        <X size={20} />
      </button>
    </div>
  );
};

export default HeroBanner;
