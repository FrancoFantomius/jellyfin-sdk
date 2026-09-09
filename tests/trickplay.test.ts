import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';
import type { BaseItemDto } from '../src/types.js';

describe('TrickplayModule', () => {
  it('should generate tiles HLS URL and thumbnail tile image URL', () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-trickplay-1'
    });

    const hlsUrl = client.trickplay.getTilesHlsUrl('item-vid-1', 320, {
      mediaSourceId: 'ms-source-1'
    });

    const parsedHls = new URL(hlsUrl);
    expect(parsedHls.pathname).toBe('/Videos/item-vid-1/Trickplay/320/tiles.m3u8');
    expect(parsedHls.searchParams.get('api_key')).toBe('token-trickplay-1');
    expect(parsedHls.searchParams.get('X-Emby-Token')).toBe('token-trickplay-1');
    expect(parsedHls.searchParams.get('MediaSourceId')).toBe('ms-source-1');

    const tileUrl = client.trickplay.getTileImageUrl('item-vid-1', 320, 3, {
      useQueryToken: false
    });

    const parsedTile = new URL(tileUrl);
    expect(parsedTile.pathname).toBe('/Videos/item-vid-1/Trickplay/320/3.jpg');
    expect(parsedTile.searchParams.has('api_key')).toBe(false);
  });

  it('should fetch and parse trickplay tiles.m3u8 manifest', async () => {
    const sampleM3u8 = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXTINF:10.000,
0.jpg
#EXTINF:10.000,
1.jpg
#EXT-X-ENDLIST`;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/vnd.apple.mpegurl' }),
      text: async () => sampleM3u8
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-123',
      fetch: mockFetch as unknown as typeof fetch
    });

    const manifest = await client.trickplay.getTrickplayManifest('item-vid-1', 320, {
      mediaSourceId: 'ms-1'
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(manifest.width).toBe(320);
    expect(manifest.tiles).toHaveLength(2);
    expect(manifest.tiles[0].index).toBe(0);
    expect(manifest.tiles[0].durationMs).toBe(10000);
    expect(manifest.tiles[0].url).toContain('/Videos/item-vid-1/Trickplay/320/0.jpg');
    expect(manifest.tiles[1].index).toBe(1);
    expect(manifest.tiles[1].durationMs).toBe(10000);
    expect(manifest.tiles[1].url).toContain('/Videos/item-vid-1/Trickplay/320/1.jpg');
  });

  it('should extract available resolutions and metadata from BaseItemDto', () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com'
    });

    const mockItem: BaseItemDto = {
      Id: 'vid-123',
      Name: 'Big Buck Bunny',
      Trickplay: {
        'ms-123': {
          '320': {
            Width: 320,
            Height: 180,
            TileWidth: 10,
            TileHeight: 10,
            ThumbnailCount: 150,
            Interval: 10000,
            Bandwidth: 150000
          },
          '640': {
            Width: 640,
            Height: 360,
            TileWidth: 5,
            TileHeight: 5,
            ThumbnailCount: 150,
            Interval: 10000,
            Bandwidth: 300000
          }
        }
      }
    };

    const resolutions = client.trickplay.getAvailableResolutions(mockItem, 'ms-123');
    expect(resolutions).toEqual([320, 640]);

    const info320 = client.trickplay.getTrickplayInfo(mockItem, 320, 'ms-123');
    expect(info320?.Width).toBe(320);
    expect(info320?.Height).toBe(180);

    const defaultInfo = client.trickplay.getTrickplayInfo(mockItem);
    expect(defaultInfo?.Width).toBe(320);
  });

  it('should calculate timestamp-to-sprite coordinates accurately', () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc'
    });

    const mockItem: BaseItemDto = {
      Id: 'vid-scrub-1',
      Name: 'Movie Demo',
      Trickplay: {
        'source-1': {
          '320': {
            Width: 320,
            Height: 180,
            TileWidth: 10, // 10 columns
            TileHeight: 10, // 10 rows => 100 thumbs per sheet
            ThumbnailCount: 250,
            Interval: 10000, // 10 seconds per thumb
            Bandwidth: 150000
          }
        }
      }
    };

    // 1. Timestamp 0 ms -> Sheet 0, Col 0, Row 0 -> (0, 0)
    const thumb0 = client.trickplay.getThumbnailForTimestamp({
      item: mockItem,
      timestampMs: 0,
      width: 320
    });
    expect(thumb0).not.toBeNull();
    expect(thumb0?.tileIndex).toBe(0);
    expect(thumb0?.thumbnailIndex).toBe(0);
    expect(thumb0?.x).toBe(0);
    expect(thumb0?.y).toBe(0);
    expect(thumb0?.width).toBe(320);
    expect(thumb0?.height).toBe(180);
    expect(thumb0?.imageUrl).toContain('/Videos/vid-scrub-1/Trickplay/320/0.jpg');

    // 2. Timestamp 35,000 ms (35s) -> thumbIndex = 3 -> Col 3, Row 0 -> (960, 0)
    const thumb35s = client.trickplay.getThumbnailForTimestamp({
      item: mockItem,
      timestampMs: 35000,
      width: 320
    });
    expect(thumb35s?.tileIndex).toBe(0);
    expect(thumb35s?.thumbnailIndex).toBe(3);
    expect(thumb35s?.x).toBe(960);
    expect(thumb35s?.y).toBe(0);

    // 3. Timestamp 125,000 ms (12.5 thumbs = thumbIndex 12) -> Col 2, Row 1 -> x = 640, y = 180
    const thumb12 = client.trickplay.getThumbnailForTimestamp({
      item: mockItem,
      timestampMs: 125000,
      width: 320
    });
    expect(thumb12?.thumbnailIndex).toBe(12);
    expect(thumb12?.x).toBe(640);
    expect(thumb12?.y).toBe(180);

    // 4. Timestamp 1,050,000 ms (105 thumbs => sheet 1, indexInSheet = 5 -> col 5, row 0)
    const thumbSheet1 = client.trickplay.getThumbnailForTimestamp({
      item: mockItem,
      timestampMs: 1050000,
      width: 320
    });
    expect(thumbSheet1?.tileIndex).toBe(1);
    expect(thumbSheet1?.thumbnailIndex).toBe(105);
    expect(thumbSheet1?.x).toBe(1600); // 5 * 320
    expect(thumbSheet1?.y).toBe(0);
    expect(thumbSheet1?.imageUrl).toContain('/Videos/vid-scrub-1/Trickplay/320/1.jpg');

    // 5. Using ticks (e.g. 50 seconds in ticks = 50 * 10,000,000 = 500,000,000 ticks = 50,000 ms = thumb 5)
    const thumbTicks = client.trickplay.getThumbnailForTimestamp({
      item: mockItem,
      timestampTicks: 500000000,
      width: 320
    });
    expect(thumbTicks?.thumbnailIndex).toBe(5);
  });
});

