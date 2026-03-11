import { useState, useEffect } from 'react';
import { PARKS, AlertEvent } from './parksData';
import { getRandomPointInZone } from './zoneGenerator';

let sharedAlerts: AlertEvent[] = [];
let listeners: ((alerts: AlertEvent[]) => void)[] = [];
let currentParkId: string | null = null;
let eventSource: EventSource | null = null;

export interface PredictiveState {
    lunarIllumination: number;
    threatMultiplier: number;
    recommendedPatrolZones: string[];
}

export interface EnvironmentData {
    temperature: number;
    windSpeed: number;
    precipitationProbability: number;
    weatherCode: number;
    weatherDescription: string;
    lunarIllumination: number;
    threatMultiplier: number;
    lastUpdated: string;
}

let sharedPredictiveState: PredictiveState | null = null;
let predictiveListeners: ((state: PredictiveState | null) => void)[] = [];

let sharedEnvironmentData: EnvironmentData | null = null;
let environmentListeners: ((data: EnvironmentData | null) => void)[] = [];

export function addAlert(alert: AlertEvent) {
    sharedAlerts = [alert, ...sharedAlerts].slice(0, 50);
    listeners.forEach(l => l(sharedAlerts));
}

export function useLiveAlerts(parkId?: string | null) {
    const [alerts, setAlerts] = useState<AlertEvent[]>([]);
    const [predictiveState, setPredictiveState] = useState<PredictiveState | null>(null);
    const [environmentData, setEnvironmentData] = useState<EnvironmentData | null>(null);

    useEffect(() => {
        if (!parkId) {
            setAlerts([]);
            return;
        }
        
        if (currentParkId !== parkId) {
            currentParkId = parkId;
            const park = PARKS.find(p => p.id === parkId);
            sharedAlerts = park ? [...park.mockAlerts] : [];
            
            if (eventSource) {
                eventSource.close();
            }
            
            eventSource = new EventSource('/api/events');
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'NEW_ALERT' && park) {
                    const newAlert = data.payload;
                    const zonePolygon = park.zones[newAlert.zone];
                    if (zonePolygon) {
                        newAlert.location = getRandomPointInZone(zonePolygon);
                    } else {
                        newAlert.location = park.centerCoordinates;
                    }
                    addAlert(newAlert);
                } else if (data.type === 'CLEAR_FEED') {
                    sharedAlerts = [];
                    listeners.forEach(l => l(sharedAlerts));
                } else if (data.type === 'SYSTEM_STATE') {
                    if (data.payload.feature === 'PREDICTIVE_THREAT') {
                        sharedPredictiveState = data.payload.data;
                        predictiveListeners.forEach(l => l(sharedPredictiveState));
                    }
                } else if (data.type === 'ENVIRONMENT_UPDATE') {
                    sharedEnvironmentData = data.payload;
                    environmentListeners.forEach(l => l(sharedEnvironmentData));
                }
            };
        }

        setAlerts([...sharedAlerts]);
        setPredictiveState(sharedPredictiveState);
        setEnvironmentData(sharedEnvironmentData);
        
        const listener = (newAlerts: AlertEvent[]) => setAlerts([...newAlerts]);
        const predListener = (newState: PredictiveState | null) => setPredictiveState(newState);
        const envListener = (newData: EnvironmentData | null) => setEnvironmentData(newData);
        
        listeners.push(listener);
        predictiveListeners.push(predListener);
        environmentListeners.push(envListener);
        
        return () => {
            listeners = listeners.filter(l => l !== listener);
            predictiveListeners = predictiveListeners.filter(l => l !== predListener);
            environmentListeners = environmentListeners.filter(l => l !== envListener);
        };
    }, [parkId]);

    return { alerts, predictiveState, environmentData };
}
