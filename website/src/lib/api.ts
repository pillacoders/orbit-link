const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('orbitlink_token');
  }

  async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, token, headers = {} } = options;
    const authToken = token || this.getToken();

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Auth
  signup(data: { email: string; username: string; password: string; referralCode?: string }) {
    return this.request('/auth/signup', { method: 'POST', body: data });
  }

  googleLogin(data: { googleId: string; email: string; name?: string }) {
    return this.request('/auth/google', { method: 'POST', body: data });
  }

  walletLogin(data: { walletAddress: string; signature: string; message: string }) {
    return this.request('/auth/wallet', { method: 'POST', body: data });
  }

  linkWallet(data: { walletAddress: string; signature: string; message: string }) {
    return this.request('/auth/wallet/link', { method: 'POST', body: data });
  }

  login(data: { email: string; password: string }) {
    return this.request('/auth/login', { method: 'POST', body: data });
  }

  getProfile() {
    return this.request('/auth/profile');
  }

  // Points
  getEarnings() {
    return this.request('/points/earnings');
  }

  getPointsHistory(page = 1) {
    return this.request(`/points/history?page=${page}`);
  }

  redeemPoints() {
    return this.request('/points/redeem', { method: 'POST' });
  }

  getEarningsChart(days = 7) {
    return this.request(`/points/chart?days=${days}`);
  }

  claimDailyBonus() {
    return this.request('/points/daily-bonus', { method: 'POST' });
  }

  getDailyBonusStatus() {
    return this.request('/points/daily-bonus/status');
  }

  // Nodes
  getNodes() {
    return this.request('/nodes');
  }

  registerNode(type = 'EXTENSION') {
    return this.request('/nodes/register', { method: 'POST', body: { type } });
  }

  nodeHeartbeat(nodeId: string, connectionQuality: number, isActive: boolean) {
    return this.request('/nodes/heartbeat', { method: 'POST', body: { nodeId, connectionQuality, isActive } });
  }

  // Referrals
  getReferralStats() {
    return this.request('/referrals/stats');
  }

  // Tasks
  getTasks() {
    return this.request('/tasks');
  }

  completeTask(taskId: string, body?: any) {
    return this.request(`/tasks/${taskId}/complete`, { method: 'POST', body });
  }

  verifyDiscordTask(code: string) {
    return this.request('/tasks/discord/verify', { method: 'POST', body: { code } });
  }

  // Epochs
  getActiveEpoch() {
    return this.request('/epochs/active');
  }

  getAllEpochs() {
    return this.request('/epochs');
  }

  getEpochLeaderboard(epochId: string) {
    return this.request(`/epochs/${epochId}/leaderboard`);
  }

  getEpochs() {
    return this.request('/epochs');
  }

  getEpochStats(epochId: string) {
    return this.request(`/epochs/${epochId}/stats`);
  }

  // Leaderboard
  getLeaderboard(page = 1) {
    return this.request(`/leaderboard?page=${page}`);
  }

  getMyRank() {
    return this.request('/leaderboard/me');
  }

  // Admin
  getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  getAdminUsers(page = 1, search?: string) {
    return this.request(`/admin/users?page=${page}${search ? `&search=${search}` : ''}`);
  }

  toggleUser(userId: string) {
    return this.request(`/admin/users/${userId}/toggle`, { method: 'POST' });
  }

  getAnnouncements() {
    return this.request('/admin/announcements');
  }

  createAnnouncement(data: { title: string; content: string; type: string }) {
    return this.request('/admin/announcements', { method: 'POST', body: data });
  }

  // ─── Relay / Network ──────────────────────────────────────
  getRelayStats() {
    return this.request('/relay/stats');
  }

  getRelayLive() {
    return this.request('/relay/live');
  }

  getRelayFeed(limit = 20) {
    return this.request(`/relay/feed?limit=${limit}`);
  }

  getRelayRegions() {
    return this.request('/relay/regions');
  }

  getRelayGeo() {
    return this.request('/relay/geo');
  }

  getRelayHistorical(hours = 24) {
    return this.request(`/relay/historical?hours=${hours}`);
  }

  // ─── Gamification ─────────────────────────────────────────
  getUserProfile() {
    return this.request('/gamification/profile');
  }

  getAllAchievements() {
    return this.request('/gamification/achievements');
  }

  getMyAchievements() {
    return this.request('/gamification/achievements/mine');
  }

  setContributionMode(mode: string) {
    return this.request('/gamification/mode', { method: 'POST', body: { mode } });
  }

  // ─── Guilds ───────────────────────────────────────────────
  getGuilds(page = 1) {
    return this.request(`/guilds?page=${page}`);
  }

  getGuild(guildId: string) {
    return this.request(`/guilds/${guildId}`);
  }

  createGuild(data: { name: string; tag: string; description?: string }) {
    return this.request('/guilds', { method: 'POST', body: data });
  }

  joinGuild(guildId: string) {
    return this.request(`/guilds/${guildId}/join`, { method: 'POST' });
  }

  leaveGuild(guildId: string) {
    return this.request(`/guilds/${guildId}/leave`, { method: 'POST' });
  }

  getGuildLeaderboard() {
    return this.request('/guilds/leaderboard');
  }

  // ─── Invite / Waitlist ────────────────────────────────────
  generateInviteCode() {
    return this.request('/invite/generate', { method: 'POST' });
  }

  getWaitlistPosition() {
    return this.request('/invite/position');
  }

  redeemInviteCode(code: string) {
    return this.request('/invite/redeem', { method: 'POST', body: { code } });
  }
}

export const api = new ApiClient(API_URL);
export default api;
