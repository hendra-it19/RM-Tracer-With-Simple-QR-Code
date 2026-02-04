import React, { useEffect, useState } from 'react';
import './InstallPWA.css';
import { Share, PlusSquare } from 'lucide-react';

const InstallPWA = () => {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsInstalled(true);
            return; // Don't show prompts if installed
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        if (isIosDevice && !isInstalled) {
            // Show iOS prompt after a small delay or check localStorage to not annoy user
            // For now, check if we haven't dismissed it
            const hasDismissed = localStorage.getItem('iosPwaDismissed');
            if (!hasDismissed) {
                setSupportsPWA(true);
                setShowIOSPrompt(true);
            }
        }

        // Android / Desktop Standard Flow
        const handler = (e) => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isInstalled]);

    const onClick = (evt) => {
        evt.preventDefault();
        if (!promptInstall) {
            return;
        }
        promptInstall.prompt();
        promptInstall.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                setSupportsPWA(false);
            }
            setPromptInstall(null);
        });
    };

    const onClose = () => {
        setSupportsPWA(false);
        setShowIOSPrompt(false);
        if (isIOS) {
            localStorage.setItem('iosPwaDismissed', 'true');
        }
    };

    if (!supportsPWA || isInstalled) {
        return null;
    }

    // iOS Custom Prompt
    if (showIOSPrompt && isIOS) {
        return (
            <div className="pwa-install-banner ios-banner">
                <div className="pwa-content">
                    <div className="pwa-text">
                        <strong>Install RM Tracer</strong>
                        <p className="text-sm mt-1">
                            Untuk menginstall di iPhone/iPad:
                            <br />
                            1. Tap tombol <strong>Share</strong> <Share size={14} className="inline" />
                            <br />
                            2. Pilih <strong>Add to Home Screen</strong> <PlusSquare size={14} className="inline" />
                        </p>
                    </div>
                    <div className="pwa-actions">
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Desktop Prompt
    if (promptInstall) {
        return (
            <div className="pwa-install-banner">
                <div className="pwa-content">
                    <div className="pwa-text">
                        <strong>Install Aplikasi</strong>
                        <p>Install aplikasi ini untuk pengalaman yang lebih baik.</p>
                    </div>
                    <div className="pwa-actions">
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>
                            Nanti
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={onClick}>
                            Install
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default InstallPWA;
