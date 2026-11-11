import clsx from 'clsx';
import isElectron from 'is-electron';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiCheckboxBlankLine, RiCloseLine, RiSubtractLine } from 'react-icons/ri';

import appIcon from '../../../assets/icons/32x32.png';
import styles from './window-bar.module.css';

import { useRadioPlayer } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useAppFocus } from '/@/renderer/hooks/use-app-focus';
import {
    useAppStore,
    usePlayerData,
    usePlayerStatus,
    useWindowBarTrackinfo,
    useWindowSettings,
} from '/@/renderer/store';
import { Text } from '/@/shared/components/text/text';
import { Platform, PlayerStatus } from '/@/shared/types/types';

const localSettings = isElectron() ? window.api.localSettings : null;

const browser = isElectron() ? window.api.browser : null;
const close = () => browser?.exit();
const minimize = () => browser?.minimize();
const maximize = () => browser?.maximize();
const unmaximize = () => browser?.unmaximize();

interface WindowBarControlsProps {
    controls: {
        handleClose: () => void;
        handleMaximize: () => void;
        handleMinimize: () => void;
    };
    title: string;
}

const WindowsControls = ({ controls, title }: WindowBarControlsProps) => {
    const { handleClose, handleMaximize, handleMinimize } = controls;

    return (
        <div className={styles.windowsContainer}>
            <div className={styles.playerStatusContainer}>
                <img alt="" height={16} src={appIcon} style={{ flexShrink: 0 }} width={16} />
                <Text className={styles.playerStatusText} overflow="hidden" size="sm">
                    {title}
                </Text>
            </div>
            <div className={styles.windowsButtonGroup}>
                <div className={styles.windowsButton} onClick={handleMinimize} role="button">
                    <RiSubtractLine size={19} />
                </div>
                <div className={styles.windowsButton} onClick={handleMaximize} role="button">
                    <RiCheckboxBlankLine size={13} />
                </div>
                <div
                    className={clsx(styles.windowsButton, styles.exit)}
                    onClick={handleClose}
                    role="button"
                >
                    <RiCloseLine size={19} />
                </div>
            </div>
        </div>
    );
};

interface MacOsButtonIconProps {
    color: string;
    filled?: boolean;
    glyph: string;
    glyphColor: string;
}

const MacOsButtonIcon = ({ color, filled, glyph, glyphColor }: MacOsButtonIconProps) => (
    <svg aria-hidden="true" height={14} viewBox="0 0 14 14" width={14}>
        <circle className={styles.macosButtonFill} cx={7} cy={7} fill={color} r={7} />
        <circle className={styles.macosButtonRing} cx={7} cy={7} r={6.75} />
        <path
            className={styles.macosButtonGlyph}
            d={glyph}
            fill={filled ? glyphColor : 'none'}
            stroke={filled ? 'none' : glyphColor}
            strokeWidth={1.4}
        />
    </svg>
);

const MacOsControls = ({ controls, title }: WindowBarControlsProps) => {
    const { handleClose, handleMaximize, handleMinimize } = controls;
    const isWindowFocused = useAppFocus();

    return (
        <div className={styles.macosContainer}>
            <div className={clsx(styles.macosButtonGroup, !isWindowFocused && styles.inactive)}>
                <div
                    className={clsx(styles.macosButton, styles.minButton)}
                    id="min-button"
                    onClick={handleMinimize}
                >
                    <MacOsButtonIcon color="#febc2e" glyph="M3.6 7h6.8" glyphColor="#8f5a14" />
                </div>
                <div
                    className={clsx(styles.macosButton, styles.maxButton)}
                    id="max-button"
                    onClick={handleMaximize}
                >
                    <MacOsButtonIcon
                        color="#28c840"
                        filled
                        glyph="M4 4h5.4L4 9.4zM10 10H4.6L10 4.6z"
                        glyphColor="#075d0c"
                    />
                </div>
                <div className={clsx(styles.macosButton)} id="close-button" onClick={handleClose}>
                    <MacOsButtonIcon
                        color="#ff5f57"
                        glyph="M4.5 4.5l5 5M9.5 4.5l-5 5"
                        glyphColor="#8a130b"
                    />
                </div>
            </div>
            <div className={styles.playerStatusContainer}>
                <Text className={styles.playerStatusText} overflow="hidden" size="sm">
                    {title}
                </Text>
            </div>
        </div>
    );
};

export const WindowBar = () => {
    const { t } = useTranslation();
    const { windowBarStyle } = useWindowSettings();
    const windowBarTrackinfo = useWindowBarTrackinfo();

    const playerStatus = usePlayerStatus();
    const privateMode = useAppStore((state) => state.privateMode);
    const handleMinimize = () => minimize();

    const { currentSong, index, queueLength } = usePlayerData();
    const { isPlaying: isRadioPlaying, metadata, stationName } = useRadioPlayer();
    const isRadioActive = Boolean(stationName || metadata);
    const [max, setMax] = useState(localSettings?.env.START_MAXIMIZED || false);

    const handleMaximize = useCallback(() => {
        if (max) {
            unmaximize();
        } else {
            maximize();
        }
        setMax(!max);
    }, [max]);

    const handleClose = useCallback(() => close(), []);

    const title = useMemo(() => {
        const privateModeString = privateMode ? t('page.windowBar.privateMode') : '';

        if (!windowBarTrackinfo) {
            return `Feishin${privateMode ? ` ${privateModeString}` : ''}`;
        }

        // Show radio information if radio is active
        if (isRadioActive) {
            const radioStatusString = !isRadioPlaying ? t('page.windowBar.paused') : '';
            const radioTitle = stationName;

            // Format metadata: show title, or combine artist and title if both available
            let radioMetadata = '';
            if (metadata) {
                if (metadata.title && metadata.artist) {
                    radioMetadata = ` — ${metadata.artist} — ${metadata.title}`;
                } else if (metadata.title) {
                    radioMetadata = ` — ${metadata.title}`;
                } else if (metadata.artist) {
                    radioMetadata = ` — ${metadata.artist}`;
                }
            }

            return `${radioStatusString}${radioTitle}${radioMetadata} — Feishin${privateMode ? ` ${privateModeString}` : ''}`;
        }

        // Show regular song information
        const statusString = playerStatus === PlayerStatus.PAUSED ? t('page.windowBar.paused') : '';
        const queueString = queueLength ? `(${index + 1} / ${queueLength}) ` : '';
        const title = `${
            queueLength
                ? `${statusString}${queueString}${currentSong?.name}${currentSong?.artistName ? ` — ${currentSong?.artistName} — Feishin` : ''}`
                : 'Feishin'
        }${privateMode ? ` ${privateModeString}` : ''}`;
        return title;
    }, [
        currentSong?.artistName,
        currentSong?.name,
        index,
        isRadioActive,
        isRadioPlaying,
        metadata,
        playerStatus,
        privateMode,
        queueLength,
        stationName,
        t,
        windowBarTrackinfo,
    ]);

    useEffect(() => {
        document.title = title;
    }, [title]);

    if (windowBarStyle === Platform.WEB) {
        return null;
    }

    return (
        <div className={styles.windowBar}>
            {windowBarStyle === Platform.WINDOWS && (
                <WindowsControls
                    controls={{ handleClose, handleMaximize, handleMinimize }}
                    title={title}
                />
            )}
            {windowBarStyle === Platform.MACOS && (
                <MacOsControls
                    controls={{ handleClose, handleMaximize, handleMinimize }}
                    title={title}
                />
            )}
        </div>
    );
};
