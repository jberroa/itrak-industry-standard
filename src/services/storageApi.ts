import type { Building, LidarScan, UserProfile } from '../types';

export interface BootstrapData {
  buildings: Building[];
  userProfiles: UserProfile[];
  lidarScans: LidarScan[];
  passcode: string;
}

async function handleResponse(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  const res = await fetch('/api/data');
  await handleResponse(res);
  return res.json() as Promise<BootstrapData>;
}

export async function saveBuildings(buildings: Building[]): Promise<void> {
  const res = await fetch('/api/buildings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildings),
  });
  await handleResponse(res);
}

export async function saveUserProfiles(profiles: UserProfile[]): Promise<void> {
  const res = await fetch('/api/user-profiles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profiles),
  });
  await handleResponse(res);
}

export async function saveLidarScans(scans: LidarScan[]): Promise<void> {
  const res = await fetch('/api/lidar-scans', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scans),
  });
  await handleResponse(res);
}

export async function savePasscode(passcode: string): Promise<void> {
  const res = await fetch('/api/passcode', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  await handleResponse(res);
}
