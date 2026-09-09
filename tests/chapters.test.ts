import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';
import type { BaseItemDto, ChapterInfoDto, MediaSegmentDto } from '../src/types.js';

describe('ChaptersModule', () => {
  it('should extract chapters from item and generate chapter image URL', () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-chap-1'
    });

    const mockItem: BaseItemDto = {
      Id: 'item-ep-1',
      Name: 'Episode 1',
      Chapters: [
        { StartPositionTicks: 0, Name: 'Prologue' },
        { StartPositionTicks: 600000000, Name: 'Intro' },
        { StartPositionTicks: 1500000000, Name: 'Main Scene' },
        { StartPositionTicks: 13500000000, Name: 'Credits' }
      ]
    };

    const chapters = client.chapters.extractChapters(mockItem);
    expect(chapters).toHaveLength(4);
    expect(chapters[1].Name).toBe('Intro');

    const imageUrl = client.chapters.getChapterImageUrl('item-ep-1', 1, {
      maxWidth: 400,
      quality: 90,
      format: 'webp',
      tag: 'tag123'
    });

    const parsed = new URL(imageUrl);
    expect(parsed.pathname).toBe('/Items/item-ep-1/Images/Chapter/1');
    expect(parsed.searchParams.get('api_key')).toBe('token-chap-1');
    expect(parsed.searchParams.get('maxWidth')).toBe('400');
    expect(parsed.searchParams.get('quality')).toBe('90');
    expect(parsed.searchParams.get('format')).toBe('webp');
    expect(parsed.searchParams.get('tag')).toBe('tag123');
  });

  it('should fetch chapters from server for an item', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({
        Id: 'item-movie-1',
        Name: 'Test Movie',
        Chapters: [
          { StartPositionTicks: 0, Name: 'Intro Scene' },
          { StartPositionTicks: 5000000000, Name: 'Action Scene' }
        ]
      })
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-chap-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const chapters = await client.chapters.getChapters('item-movie-1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].Name).toBe('Intro Scene');
  });

  it('should fetch media segments via /MediaSegments API', async () => {
    const mockSegments: MediaSegmentDto[] = [
      {
        Id: 'seg-1',
        ItemId: 'item-ep-1',
        Type: 'Intro',
        StartTicks: 600000000,
        EndTicks: 1500000000
      },
      {
        Id: 'seg-2',
        ItemId: 'item-ep-1',
        Type: 'Outro',
        StartTicks: 13000000000,
        EndTicks: 14000000000
      }
    ];

    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockSegments
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    const segments = await client.chapters.getMediaSegments('item-ep-1', {
      includeSegmentTypes: ['Intro', 'Outro']
    });

    expect(segments).toHaveLength(2);
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/MediaSegments');
    expect(parsed.searchParams.get('itemId')).toBe('item-ep-1');
    expect(parsed.searchParams.get('includeSegmentTypes')).toBe('Intro,Outro');
  });

  it('should resolve intro and credits from MediaSegments and allow skip', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com'
    });

    const mockSegments: MediaSegmentDto[] = [
      {
        Id: 'seg-intro',
        ItemId: 'item-ep-1',
        Type: 'Intro',
        StartTicks: 600000000, // 60s
        EndTicks: 1500000000 // 150s
      },
      {
        Id: 'seg-credits',
        ItemId: 'item-ep-1',
        Type: 'Credits',
        StartTicks: 13000000000, // 1300s
        EndTicks: 14000000000 // 1400s
      }
    ];

    const markers = await client.chapters.getIntroCredits('item-ep-1', mockSegments);
    expect(markers.intro).toBeDefined();
    expect(markers.intro?.startTicks).toBe(600000000);
    expect(markers.intro?.endTicks).toBe(1500000000);
    expect(markers.credits?.startTicks).toBe(13000000000);

    // Test findCurrentSegment
    // At 30s (300,000,000 ticks) -> not in intro
    expect(client.chapters.findCurrentSegment(300000000, markers)).toBeNull();
    expect(client.chapters.getSkipPosition(300000000, markers)).toBeNull();

    // At 90s (900,000,000 ticks) -> inside intro!
    const introSeg = client.chapters.findCurrentSegment(900000000, markers);
    expect(introSeg).not.toBeNull();
    expect(introSeg?.type).toBe('Intro');
    expect(client.chapters.getSkipPosition(900000000, markers)).toBe(1500000000);

    // At 1350s (13,500,000,000 ticks) -> inside credits!
    const creditsSeg = client.chapters.findCurrentSegment(13500000000, markers);
    expect(creditsSeg?.type).toBe('Credits');
    expect(client.chapters.getSkipPosition(13500000000, markers)).toBe(14000000000);
  });

  it('should fallback to chapter heuristics for intro and credits when segments are absent', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com'
    });

    const chapters: ChapterInfoDto[] = [
      { StartPositionTicks: 0, Name: 'Cold Open' },
      { StartPositionTicks: 500000000, Name: 'Opening Theme' }, // 50s
      { StartPositionTicks: 1400000000, Name: 'Part 1' }, // 140s -> intro ends here
      { StartPositionTicks: 12000000000, Name: 'Ending Credits' } // 1200s
    ];

    const markers = await client.chapters.getIntroCredits(chapters, []);
    expect(markers.intro).toBeDefined();
    expect(markers.intro?.startTicks).toBe(500000000);
    expect(markers.intro?.endTicks).toBe(1400000000);
    expect(markers.credits).toBeDefined();
    expect(markers.credits?.startTicks).toBe(12000000000);
  });
});

