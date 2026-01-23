import React, { useEffect, useState } from 'react';
import './InstallPWA.css';

const InstallPWA = () => {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e);
        };

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

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
    };

    if (!supportsPWA || isInstalled) {
        return null;
    }

    return (
        <div className="pwa-install-banner">
            <div className="pwa-content">
                <div className="pwa-text">
                    <strong>Install Aplikasi</strong>
                    <p>Install aplikasi ini untuk pengalaman yang lebih baik dan akses lebih cepat.</p>
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
};

export default InstallPWA;
