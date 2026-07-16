"use client";

import { useEffect, useState } from "react";

interface XPToastProps {
  amount: number;
  /** Unique key to trigger re-animation */
  triggerId: number;
}

export default function XPToast({ amount, triggerId }: XPToastProps) {
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (triggerId === 0) return;
    setKey((k) => k + 1);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [triggerId]);

  if (!visible) return null;

  return (
    <div className="flu-xp-toast" key={key}>
      <div className="flu-xp-toast-inner">
        +{amount} ✨
      </div>
    </div>
  );
}
