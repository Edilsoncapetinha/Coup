import { useEffect, useState, useRef } from 'react';

interface TurnTimerProps {
    duration: number; // in seconds
    onTimeout: () => void;
    isActive: boolean;
    resetKey: string | number; // Change this to restart the timer
}

export default function TurnTimer({ duration, onTimeout, isActive, resetKey }: TurnTimerProps) {
    const [timeLeft, setTimeLeft] = useState(duration);
    const timeoutTriggeredRef = useRef(false);

    useEffect(() => {
        // Reset timer when resetKey changes or when becoming active
        setTimeLeft(duration);
        timeoutTriggeredRef.current = false;
    }, [resetKey, duration, isActive]);

    useEffect(() => {
        if (!isActive) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    if (!timeoutTriggeredRef.current) {
                        timeoutTriggeredRef.current = true;
                        onTimeout();
                    }
                    return 0;
                }
                return prev - 0.1; // Update every 100ms for smooth animation
            });
        }, 100);

        return () => clearInterval(timer);
    }, [isActive, onTimeout]);

    if (!isActive) return null;

    const percentage = (timeLeft / duration) * 100;

    // Color logic
    let colorClass = 'bg-emerald-500';
    if (percentage < 60) colorClass = 'bg-amber-500';
    if (percentage < 30) colorClass = 'bg-red-500';

    return (
        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden mt-2 backdrop-blur-sm border border-gray-600 shadow-lg relative">
            <div
                className={`h-full transition-all duration-100 ease-linear ${colorClass}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}
