import { dataService } from '@hanzochat/data-provider';

jest.mock('@hanzochat/data-provider', () => ({
  ...jest.requireActual('@hanzochat/data-provider'),
  dataService: {
    getMemories: jest.fn(),
  },
}));

describe('getMemories', () => {
  it('should fetch memories from /api/memories', async () => {
    const mockData = [{ key: 'foo', value: 'bar', updated_at: '2024-05-01T00:00:00Z' }];

    (dataService.getMemories as jest.Mock).mockResolvedValueOnce(mockData);

    const result = await dataService.getMemories();

    expect(dataService.getMemories).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });
});
