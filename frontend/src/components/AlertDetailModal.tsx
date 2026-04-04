import React from 'react';
import { AlertTriangle, MapPin, Camera, Radio, ShieldAlert, Activity, X } from 'lucide-react';
import { AlertEvent } from '../lib/parksData';
import NarrativePanel from './NarrativePanel';
import HypothesisCard from './HypothesisCard';
import { getCachedHypothesis } from '../services/hypothesisEngine';

interface AlertDetailModalProps {
  alert: AlertEvent;
  recentAlerts: AlertEvent[];
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  ACOUSTIC: 'Acoustic Sensor',
  CAMERA: 'Camera Trap',
  COMMUNITY: 'Community Report',
  CORRELATED: 'Correlated Incident',
  ONE_HEALTH: 'One Health Flag',
  WILDLIFE_CORRELATION: 'Wildlife Correlation',
};

const PRIORITY_STYLES: Record<string, React.CSSProperties> = {
  CRITICAL: { background: 'rgba(255,68,68,0.12)', color: '#FF4444', border: '1px solid rgba(255,68,68,0.4)' },
  HIGH: { background: 'rgba(255,100,0,0.12)', color: '#FF6400', border: '1px solid rgba(255,100,0,0.4)' },
  ELEVATED: { background: 'rgba(255,149,0,0.12)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.4)' },
  PREDICTIVE: { background: 'rgba(255,149,0,0.1)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.25)' },
  NORMAL: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' },
};

function SourceIcon({ type }: { type: string }) {
  const size = 20;
  switch (type) {
    case 'ACOUSTIC': return <Radio size={size} style={{ color: '#FF4444' }} />;
    case 'CAMERA': return <Camera size={size} style={{ color: '#FF9500' }} />;
    case 'COMMUNITY': return <MapPin size={size} style={{ color: '#60A5FA' }} />;
    case 'CORRELATED': return <ShieldAlert size={size} style={{ color: '#FF4444' }} />;
    case 'ONE_HEALTH': return <Activity size={size} style={{ color: '#A78BFA' }} />;
    default: return <AlertTriangle size={size} style={{ color: 'rgba(255,255,255,0.4)' }} />;
  }
}

const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, recentAlerts, onClose }) => {
  const priorityStyle = PRIORITY_STYLES[alert.priority] ?? PRIORITY_STYLES.NORMAL;
  const cachedHypothesis = getCachedHypothesis(alert.id);
  const showNarrative = alert.priority === 'CRITICAL' || alert.priority === 'ELEVATED';
  const showHypothesis = alert.priority === 'CRITICAL';
  const isPredictive = alert.priority === 'PREDICTIVE';

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {/* Drawer panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '480px',
          maxWidth: '95vw',
          height: '100vh',
          background: '#080D18',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SourceIcon type={alert.type} />
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}>
                {TYPE_LABELS[alert.type] ?? alert.type}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                {alert.subType.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Metadata */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {/* Priority badge */}
            <span style={{
              ...priorityStyle,
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: '0.1em',
              padding: '3px 10px',
              borderRadius: '4px',
            }}>
              {isPredictive ? 'PREDICTIVE' : alert.priority}
            </span>

            {/* Zone badge */}
            <span style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '3px 10px',
              borderRadius: '4px',
            }}>
              ZONE {alert.zone.replace('Z', '')}
            </span>

            {/* Confidence badge */}
            {alert.confidence != null && (
              <span style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '3px 10px',
                borderRadius: '4px',
              }}>
                {(alert.confidence * 100).toFixed(0)}% CONF
              </span>
            )}
          </div>

          {/* Description */}
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            {alert.description}
          </p>

          {/* Timestamp */}
          <div style={{
            marginTop: '10px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
          }}>
            {alert.timestamp}
          </div>
        </div>

        {/* Predictive correlation block */}
        {isPredictive && (
          <div style={{
            margin: '16px 24px 0',
            background: 'rgba(255,149,0,0.06)',
            border: '1px solid rgba(255,149,0,0.2)',
            borderRadius: '8px',
            padding: '16px 20px',
          }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#FF9500',
              letterSpacing: '0.12em',
              marginBottom: '12px',
            }}>
              PREDICTIVE THREAT INTELLIGENCE
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#FF9500', lineHeight: 1 }}>
              {alert.confidence ? Math.round(alert.confidence * 100) : '—'}%
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              of wildlife sightings in {alert.zone} preceded a poaching attempt
            </div>
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,149,0,0.15)', paddingTop: '12px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                ELEVATED RISK WINDOW
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                Next 48 hours
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                {alert.subType}
              </div>
            </div>
          </div>
        )}

        {/* AI stack — Brief 2 (Hypothesis) then Brief 1 (Narrative) */}
        <div style={{ padding: '0 24px 24px', flex: 1 }}>
          {showHypothesis && (
            <HypothesisCard
              hypothesis={cachedHypothesis?.hypothesis ?? null}
              isLoading={cachedHypothesis?.loading ?? false}
            />
          )}
          {showNarrative && (
            <NarrativePanel alert={alert} recentAlerts={recentAlerts} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
