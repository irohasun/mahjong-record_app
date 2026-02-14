const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
}));

const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

const mockAuth = {
  getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
  signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
};

const mockStorage = {
  from: jest.fn(() => ({
    upload: jest.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/public' } }),
  })),
};

export const supabase = {
  from: mockFrom,
  rpc: mockRpc,
  auth: mockAuth,
  storage: mockStorage,
};

export const isSupabaseConfigured = true;
