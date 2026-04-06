# Android Camera, Media Handling & Storage Research

> Comprehensive research for x/pat (Expo SDK 55, React Native 0.83.4, Supabase backend)
> Covers all 25 topics with implementation guidance and specific x/pat recommendations.
> Date: April 2026

---

## Table of Contents

1. [Android Camera API: CameraX vs Camera2](#1-android-camera-api-camerax-vs-camera2)
2. [expo-image-picker Android Behavior](#2-expo-image-picker-android-behavior)
3. [Android 13+ Photo Picker & Granular Permissions](#3-android-13-photo-picker--granular-permissions)
4. [Android Scoped Storage](#4-android-scoped-storage)
5. [Image Compression on Android](#5-image-compression-on-android)
6. [Image Caching Strategies on Android](#6-image-caching-strategies-on-android)
7. [expo-image vs react-native-fast-image vs Image](#7-expo-image-vs-react-native-fast-image-vs-image)
8. [Video Recording & Compression on Android](#8-video-recording--compression-on-android)
9. [Android MediaStore API](#9-android-mediastore-api)
10. [Image Editing/Cropping on Android](#10-image-editingcropping-on-android)
11. [EXIF Data Handling on Android](#11-exif-data-handling-on-android)
12. [Android content:// URIs vs file:// Paths](#12-android-content-uris-vs-file-paths)
13. [Supabase Storage Upload from Android](#13-supabase-storage-upload-from-android)
14. [Image Placeholder/Skeleton Loading](#14-image-placeholderskeleton-loading)
15. [Android Photo Grid Performance](#15-android-photo-grid-performance)
16. [Android Share Intent for Receiving Images](#16-android-share-intent-for-receiving-images)
17. [SVG Rendering on Android](#17-svg-rendering-on-android)
18. [Android Notification Images](#18-android-notification-images)
19. [GIF & Animated Image Support](#19-gif--animated-image-support)
20. [Android File Size Limits](#20-android-file-size-limits)
21. [Cloudflare Images / imgproxy Integration](#21-cloudflare-images--imgproxy-integration)
22. [Android WebP Support](#22-android-webp-support)
23. [Camera Permissions UX on Android](#23-camera-permissions-ux-on-android)
24. [Multiple Image Selection on Android](#24-multiple-image-selection-on-android)
25. [Image Accessibility on Android](#25-image-accessibility-on-android)

---

## 1. Android Camera API: CameraX vs Camera2

### Background

Android has two native camera APIs:
- **Camera2** (API 21+): Low-level, full control over exposure, focus, capture pipeline. Complex to use correctly across device fragmentation.
- **CameraX** (Jetpack library): Higher-level abstraction over Camera2. Google's recommended API for new apps. Handles device-specific quirks automatically.

### What expo-image-picker Uses

expo-image-picker does **not** use either API directly for the gallery picker flow. When launching the camera (`launchCameraAsync`), it delegates to the system camera app via an Intent, not CameraX/Camera2. The system camera app handles all camera hardware interaction.

expo-camera (if used separately) uses **CameraX** on Android, including dedicated screen flash mode.

### react-native-vision-camera

Marc Rousavy's react-native-vision-camera originally used CameraX but **rewrote the entire Android implementation to use Camera2** because CameraX was "not ready for advanced use-cases" (frame processors, manual controls, custom capture pipelines). Latest releases upgraded to CameraX 1.5.0-alpha02 for basic features while keeping Camera2 for advanced paths.

### x/pat Recommendation

**No action needed.** x/pat uses `expo-image-picker` which delegates to the system camera Intent. This is the safest and most compatible approach -- the device's native camera app handles hardware differences. Only consider expo-camera or vision-camera if x/pat adds in-app camera features like live filters or QR code scanning.

---

## 2. expo-image-picker Android Behavior

### Current x/pat Usage

Three places use expo-image-picker:
1. **AddSpotScreen** -- gallery only (`launchImageLibraryAsync`), single image, 4:3 aspect, quality 0.6
2. **FeedScreen** -- gallery only, single image, 4:3 aspect, quality 0.8
3. **useAvatar hook** -- gallery OR camera (user choice via Alert), 1:1 aspect, quality 0.8

### Gallery vs Camera Behavior on Android

| Feature | Gallery (`launchImageLibraryAsync`) | Camera (`launchCameraAsync`) |
|---------|-------------------------------------|-------------------------------|
| Permissions needed | None on Android 13+ (uses system photo picker) | CAMERA permission required |
| UI | System photo picker (no broad access) | Opens system camera app via Intent |
| File URIs returned | `content://` URI (temporary) | `file://` URI in app's cache |
| allowsEditing | Opens Android's built-in crop UI | Opens crop UI after capture |
| Multiple selection | Supported via `allowsMultipleSelection` | Not supported |

### File URI Behavior

On Android, `launchImageLibraryAsync` returns a **`content://` URI** that is a temporary grant. This URI:
- Is valid for the current session only
- Cannot be accessed by other processes without re-granting
- Works with `fetch()` to read as blob
- Works with `expo-image-manipulator`

On Android, `launchCameraAsync` returns a **`file://` URI** in the app's cache directory.

### Permissions Auto-Injection Issue (CRITICAL)

expo-image-picker automatically adds `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, and `CAMERA` to AndroidManifest.xml. This causes **Google Play rejections** for apps that don't need broad media access as a core feature.

### x/pat Recommendation

**HIGH PRIORITY FIX:** x/pat does not need broad media access -- users pick one photo at a time. You need to remove the auto-injected permissions. In `app.json`, add an `android.blockedPermissions` config:

```json
{
  "expo": {
    "android": {
      "blockedPermissions": [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO"
      ]
    }
  }
}
```

This prevents Google Play rejection. The system photo picker on Android 13+ works without these permissions. Keep `CAMERA` only because `useAvatar` uses `launchCameraAsync`.

---

## 3. Android 13+ Photo Picker & Granular Permissions

### How the System Photo Picker Works

Starting with Android 13 (API 33), Android introduced the **system photo picker** which:
- Requires **no runtime permissions** to use
- Shows a pre-built media selection UI managed by the OS
- Returns only the selected files (user controls what the app sees)
- Supports single and multiple selection
- Cannot browse the full file system (unlike pre-13 behavior)

### Android 14+ Enhancements

Android 14 added:
- "Selected Photos Access" partial grant -- user can grant access to specific photos instead of all-or-nothing
- Improved photo picker performance
- Better integration with cloud photo providers (Google Photos)

### Google Play Policy (Enforced 2025+)

Google's Photo and Video Permissions policy now requires:
- Apps with **one-time or infrequent** photo access must use the system photo picker
- Only apps where broad photo/video access is **core functionality** (gallery apps, photo editors) may request READ_MEDIA_IMAGES
- Apps not meeting the policy will be **rejected** from the Play Store

### x/pat Recommendation

x/pat's photo use is infrequent (uploading spot photos, profile pictures, post images). The system photo picker is the correct approach. expo-image-picker on SDK 55 automatically uses the system photo picker on Android 13+, but you must **block the READ_MEDIA_* permissions** from the manifest (see Section 2 above).

---

## 4. Android Scoped Storage

### What Changed

Since Android 10 (API 29), **Scoped Storage** is mandatory:
- Apps can only access their own private directories by default
- Shared storage (Downloads, Pictures, etc.) requires MediaStore API or SAF
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` are effectively deprecated
- No more `file://` paths to shared storage -- everything goes through `content://` URIs

### Impact on React Native

| Action | How It Works |
|--------|-------------|
| Read user-selected photo | System picker returns `content://` URI -- works fine with `fetch()` |
| Save image to gallery | Must use MediaStore API (see Section 9) |
| Access app's own cache | `FileSystem.cacheDirectory` still works normally |
| Share file with other app | Must use FileProvider or content URIs |

### x/pat Recommendation

**No immediate issues.** x/pat's current flows work correctly because:
- Photo picking uses `expo-image-picker` (system picker, returns valid URIs)
- Uploads go to Supabase Storage (cloud, no local shared storage needed)
- Avatar and post photos are processed in the app's cache directory via `expo-image-manipulator`

If you add a "Save to gallery" feature, you'll need `expo-media-library` or `react-native-blob-util` with MediaStore support.

---

## 5. Image Compression on Android

### Current x/pat Compression Pipeline

| Use Case | Resize | Compress | Format | Final Size |
|----------|--------|----------|--------|------------|
| Spot photos | 1200px width | quality 0.7 | JPEG | ~150-300 KB |
| Post photos | 1200px width | quality 0.7 | JPEG | ~150-300 KB |
| Avatar | 500x500 | quality 0.7 | JPEG | ~30-60 KB |

### Format Comparison (2025-2026)

| Format | Compression | Android Support | Quality at Same Size |
|--------|-------------|-----------------|---------------------|
| JPEG | Baseline | All versions | Good |
| WebP | 25-35% smaller than JPEG | API 14+ (lossy), API 18+ (lossless) | Better |
| AVIF | 30-50% smaller than JPEG | API 31+ (Android 12+) | Best |
| HEIC | Similar to AVIF | API 28+ (decode only, encode API 30+) | Very Good |

### Quality Benchmarks

- **Quality 0.6-0.7**: Industry standard for user-generated content. Imperceptible quality loss.
- **Quality 0.8**: Professional/editorial content. Marginal visual improvement, 30-40% larger file.
- **Quality 0.5**: Thumbnails and previews. Noticeable artifacts on close inspection.

### react-native-compressor

The `react-native-compressor` library offers auto-compression mode that achieves 80-90% file size reduction. It adds only ~50 KB to APK size (vs FFmpeg at ~9 MB). Supports image and video compression on both platforms.

### x/pat Recommendation

**Current settings are good.** Quality 0.7 at 1200px width for spot/post photos is optimal for social content. Two improvements to consider:

1. **Switch to WebP format** for uploads: `SaveFormat.WEBP` in expo-image-manipulator. This cuts file size by 25-35% with no visible quality loss. All Android devices x/pat targets support WebP.

2. **Consider react-native-compressor** for video if you add video uploads. expo-image-manipulator handles images well.

3. **Avatar size is fine** at 500x500. No need to increase -- avatars display at max 100px in the app.

---

## 6. Image Caching Strategies on Android

### Android Native Caching (Glide)

Android's Glide library (used by expo-image under the hood) implements:
- **Memory cache**: LRU eviction, uses ~1/8 of device RAM by default
- **Disk cache**: HTTP-level caching + transformed image cache
- **Resource pool**: Recycles Bitmap objects to reduce GC pressure
- **Automatic downsampling**: Loads images at the required display size, not full resolution

### React Native `<Image>` Component Caching

The default RN `<Image>` on Android:
- Uses OkHttp URL cache for HTTP responses
- No explicit disk cache for decoded bitmaps
- Memory caching is minimal -- images are decoded fresh on re-render
- No LRU eviction strategy exposed to JS

### expo-image Caching

expo-image (using Glide on Android):
- **Disk cache**: Enabled by default, caches original + transformed images
- **Memory cache**: LRU with automatic sizing
- **Cache policies**: `disk` (default), `memory`, `memory-disk`, `none`
- **Cache inspection**: `Image.getCachePathAsync(url)` to check if cached
- **Preloading**: `Image.prefetch(urls)` for anticipated images

### x/pat Recommendation

**Migrate from `<Image>` to `expo-image`.** This is the single highest-impact Android performance improvement available. Benefits:
- Automatic LRU disk + memory caching via Glide
- Elimination of redundant network requests for spot/avatar images
- Support for BlurHash/ThumbHash placeholders
- Better memory management (prevents OOM on image-heavy screens like Feed)

Priority screens for migration:
1. FeedScreen (image-heavy, frequent scrolling)
2. SpotCard (repeated images in lists)
3. Avatar component (shown everywhere)
4. SpotDetailScreen (hero image)

---

## 7. expo-image vs react-native-fast-image vs Image

### Performance Benchmarks (2025-2026)

| Metric | RN `<Image>` | react-native-fast-image | expo-image |
|--------|-------------|------------------------|------------|
| **Initial load speed** | Baseline | 2-3x faster | 2x faster (Pixel 9 benchmark) |
| **Batch loading (50+ images)** | Best (25x faster than expo-image) | Good | Slower, can crash on 100+ simultaneous loads |
| **Memory usage** | Moderate (no recycling) | Low (Glide pooling) | Low (Glide pooling) |
| **Disk caching** | HTTP-only | Glide full pipeline | Glide full pipeline |
| **BlurHash/ThumbHash** | Not supported | Not supported | Built-in |
| **GIF support** | Requires Fresco setup | Built-in (Glide) | Built-in (Glide) |
| **Maintenance status** | React Native core | Unmaintained since 2022 | Actively maintained by Expo |
| **CSS objectFit** | resizeMode (RN-specific) | resizeMode | Standard CSS props |
| **Transition animations** | None | None | Built-in (crossDissolve, etc.) |

### Key Tradeoff

expo-image is slower than `<Image>` when loading many images simultaneously (100+ at once). However, in practice, virtualized lists render 10-20 images at a time, where expo-image performs better due to caching.

### x/pat Recommendation

**Use expo-image.** It is the clear winner for Expo SDK 55 projects:
- Active maintenance and guaranteed compatibility with Expo updates
- Built-in BlurHash/ThumbHash (premium feel for Mercury-inspired UI)
- Glide-powered caching eliminates the #1 Android image performance problem
- react-native-fast-image is unmaintained and incompatible with New Architecture

Installation: `npx expo install expo-image`

---

## 8. Video Recording & Compression on Android

### Current State in x/pat

x/pat currently does **not** support video. All image picker calls use `mediaTypes: ['images']` or `ImagePicker.MediaTypeOptions.Images`.

### Android Video Codecs

| Codec | Container | Android Support | Quality/Size |
|-------|-----------|-----------------|-------------|
| H.264 (AVC) | MP4 | All versions | Good, widely compatible |
| H.265 (HEVC) | MP4 | API 24+ (encode), API 21+ (decode) | 40-50% smaller than H.264 |
| VP9 | WebM | API 24+ | Similar to HEVC, open standard |
| AV1 | MP4/WebM | API 34+ (limited hardware) | Best compression, limited devices |

### File Size Reality

- expo-camera at 720p: **~95 MB per minute**
- expo-camera at 1080p: **~150+ MB per minute**
- After compression with react-native-compressor: **~10-15 MB per minute at 720p**

### react-native-compressor for Video

- Auto compression mode: 80-90% size reduction
- Supports target file size cap (e.g., 20 MB max)
- Progressive quality reduction until target is met
- Adds only ~50 KB to APK (no FFmpeg dependency)
- Works on both iOS and Android

### x/pat Recommendation (Future Feature)

If adding video to x/pat (e.g., short spot clips or video DMs):
1. Use `react-native-compressor` for on-device compression
2. Set strict limits: max 30 seconds, max 20 MB after compression
3. Use H.264 codec for maximum compatibility
4. Implement Supabase resumable uploads for video (see Section 13)
5. Display upload progress with percentage indicator
6. Use WebP thumbnail extracted from first frame for preview

---

## 9. Android MediaStore API

### What MediaStore Does

MediaStore is Android's database for media files on shared storage. It provides:
- Adding images/videos to the device gallery
- Querying media across the device
- Deleting media (with user consent on Android 11+)
- Sharing media between apps

### React Native Libraries

| Library | Purpose | Expo Compatible |
|---------|---------|-----------------|
| `expo-media-library` | Save to gallery, query media | Yes (managed workflow) |
| `react-native-blob-util` | Download + save to MediaStore | Requires config plugin |
| `react-native-mediastore` | Delete media on Android | Bare workflow only |

### Saving to Gallery in Expo

```typescript
import * as MediaLibrary from 'expo-media-library';

const { status } = await MediaLibrary.requestPermissionsAsync();
if (status === 'granted') {
  await MediaLibrary.saveToLibraryAsync(localFileUri);
}
```

### x/pat Recommendation

**Not needed now.** x/pat uploads photos to Supabase cloud storage -- users don't need to save spot photos to their local gallery. If you add a "Save this photo" feature on SpotDetailScreen, use `expo-media-library.saveToLibraryAsync()`. Note that `expo-media-library` is also transitioning away from READ_MEDIA_* permissions to comply with Google Play policy.

---

## 10. Image Editing/Cropping on Android

### Current expo-image-manipulator Usage

x/pat uses expo-image-manipulator in three places:

1. **AddSpotScreen**: Resize to 1200px width, compress 0.7, JPEG
2. **FeedScreen**: Resize to 1200px width, compress 0.7, JPEG, with base64
3. **useAvatar**: Resize to 500x500, compress 0.7, JPEG, with base64

### Performance Characteristics on Android

- Image manipulation runs on a **background thread** (does not block UI)
- Processing a 4000x3000 photo to 1200px width: ~200-500ms on mid-range devices
- Base64 encoding adds ~100-200ms and doubles memory usage during encoding
- Multiple chained operations (resize + crop) are batched in a single native call

### Known Android Issues

1. **Orientation bug**: On Samsung Galaxy S devices, `manipulateAsync` may swap portrait/landscape when resizing because it ignores EXIF Orientation tag. The resize applies to raw pixel dimensions, not the displayed orientation.
2. **EXIF stripping**: `manipulateAsync` removes most EXIF data from the output, including GPS coordinates. This is actually **good for privacy** but means you cannot rely on EXIF after manipulation.

### expo-image-manipulator SDK 55 (New API)

SDK 52+ introduced a new `ImageManipulator.manipulate(uri)` builder API:

```typescript
const result = await ImageManipulator.manipulate(uri)
  .resize({ width: 1200 })
  .renderAsync();
// Then save: await result.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
```

### x/pat Recommendation

**Current implementation is correct and performant.** Two improvements:

1. **Consider removing `base64: true`** from FeedScreen and useAvatar uploads. Instead, use `fetch(manipulated.uri)` to get a blob, then upload the blob directly. This halves memory usage during upload. The AddSpotScreen already does this correctly.

2. **The orientation bug on Samsung devices** is mitigated by `allowsEditing: true` in the image picker, which forces the user through a crop UI that normalizes orientation before passing the URI to manipulateAsync.

---

## 11. EXIF Data Handling on Android

### Privacy Implications

Photos taken on Android contain EXIF metadata including:
- **GPS coordinates** (exact location where photo was taken)
- **Device model** and serial number
- **Timestamp** of capture
- **Camera settings** (focal length, exposure, etc.)
- **Thumbnail** embedded in the file

Uploading photos with EXIF GPS data to a social app creates a **privacy risk** -- other users could extract the uploader's exact location.

### Current x/pat Behavior

**Good news:** expo-image-manipulator **strips most EXIF data** when processing images. After `manipulateAsync`, the output file contains minimal metadata. This means:
- GPS coordinates are removed
- Device info is removed
- Only basic image dimensions remain

### Known Android EXIF Issues

1. **Android 10+ (API 29)**: `ACCESS_MEDIA_LOCATION` permission required to read GPS from photos taken by other apps. Without it, GPS fields return null.
2. **Xiaomi devices (Android 12)**: expo-image-picker 14.5.0+ broke GPS EXIF access due to a permissions change.
3. **Orientation inconsistency**: Android and iOS handle EXIF Orientation differently. Some Android devices write Orientation=1 but rotate the actual pixel data, while others write Orientation=6 with un-rotated pixels.

### x/pat Recommendation

**The current pipeline is privacy-safe.** expo-image-manipulator strips EXIF data during processing. No user GPS data reaches Supabase Storage. No changes needed.

If you ever need to explicitly read/strip EXIF data before manipulation, consider the `expo-image-manipulator` pipeline which already handles this, or add `piexifjs` for JS-level EXIF reading/removal as a safety layer.

---

## 12. Android content:// URIs vs file:// Paths

### The Problem

On Android, different APIs return different URI types:

| Source | URI Type | Example |
|--------|----------|---------|
| System photo picker | `content://` | `content://com.android.providers.media.documents/...` |
| Camera capture | `file://` | `file:///data/user/0/com.aycholdings.xpat/cache/...` |
| App cache/tmp | `file://` | `file:///data/user/0/com.aycholdings.xpat/cache/...` |
| expo-image-manipulator output | `file://` | `file:///data/user/0/.../ImageManipulator/...` |

### React Native Gotchas

1. **`content://` URIs are temporary grants**: They may expire after the app process ends. Do not store them for later use.
2. **`fetch()` handles both**: The React Native `fetch()` API can read both `content://` and `file://` URIs on Android.
3. **Image component handles both**: `<Image source={{ uri }}` works with both URI types.
4. **FileSystem API prefers `file://`**: expo-file-system's `readAsStringAsync` may fail with `content://` URIs. Use `fetch()` instead.
5. **Uploading `content://` directly**: Supabase Storage upload via blob works fine -- `fetch(contentUri).then(r => r.blob())` converts it.

### x/pat Recommendation

**Current code handles this correctly.** The AddSpotScreen converts any URI to a blob via `fetch(photoUri)` before uploading. The useAvatar hook uses base64 from image-manipulator (which outputs `file://` URIs). No changes needed.

**One improvement:** In `AddSpotScreen.handleSubmit`, the blob size check (`blob.size > 5 * 1024 * 1024`) happens after fetching the full blob into memory. Consider moving the size check to after `manipulateAsync` using `expo-file-system.getInfoAsync(manipulated.uri)` to avoid loading a too-large image into memory.

---

## 13. Supabase Storage Upload from Android

### Current x/pat Upload Methods

| Location | Method | Details |
|----------|--------|---------|
| AddSpotScreen | `fetch(uri) -> blob -> upload` | Standard upload, no progress |
| FeedScreen | `decode(base64) -> upload` | Base64-decoded ArrayBuffer |
| useAvatar | `decode(base64) -> upload` | Base64-decoded ArrayBuffer |

### Upload Methods Comparison

| Method | Max Size | Progress Events | Resumable | Best For |
|--------|----------|----------------|-----------|----------|
| Standard (`upload()`) | 6 MB (recommended) | No | No | Small images |
| Resumable (TUS protocol) | 5 GB | Yes | Yes | Video, large files |

### Resumable Uploads (TUS Protocol)

For files >6 MB or unreliable connections (nomads on cafe WiFi), Supabase supports the TUS protocol:
- Uses 6 MB chunks
- Automatic retry on failure
- Upload URL valid for 24 hours
- Requires `tus-js-client` library
- Provides progress callbacks for UI feedback

### Upload Progress UI

For standard uploads, you can implement progress tracking with XMLHttpRequest:

```typescript
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total) * 100;
  setUploadProgress(percent);
});
```

### x/pat Recommendation

**Standard uploads are fine for the current use case.** x/pat images are compressed to ~150-300 KB, well under the 6 MB limit. Improvements to consider:

1. **Add upload progress indicator**: Replace the `ActivityIndicator` in AddSpotScreen with a percentage-based progress bar for better UX on slow connections.

2. **Standardize upload method**: Currently AddSpotScreen uses blob upload while FeedScreen/useAvatar use base64 ArrayBuffer. Pick one approach (blob is more memory-efficient).

3. **If adding video uploads**: Switch to TUS resumable uploads with `tus-js-client` for reliability.

### Supabase Image Transformations (Server-Side)

Supabase offers on-the-fly image transformations (Pro Plan):
- Resize: `getPublicUrl(path, { transform: { width: 400 } })`
- Quality: `{ transform: { quality: 60 } }`
- Format auto-negotiation: converts to WebP for supported clients
- Smart CDN caching: transformed versions cached at edge
- Cost: $5 per 1,000 origin images

This could replace client-side compression entirely -- upload full-resolution images and let Supabase serve optimized versions.

---

## 14. Image Placeholder/Skeleton Loading

### Current x/pat Approach

x/pat has a `Skeleton` component using Reanimated opacity animation (pulse effect). However, it is only used for text/layout placeholders -- **no image-specific placeholders exist**.

Images in FeedScreen and SpotCard currently show:
- Nothing (blank) while loading
- Then pop in when loaded (jarring flash)

### BlurHash

- Compact string (~20-30 characters) representing a blurred preview
- Generated server-side or on-device
- Renders a colorful blur approximation of the image
- expo-image has **built-in BlurHash support** via the `placeholder` prop
- Expo SDK 52+ added `generateBlurhashAsync()` for on-device generation
- Instagram and many social apps use this pattern

### ThumbHash

- Similar to BlurHash but with key improvements:
  - Encodes the aspect ratio
  - More accurate colors
  - Supports transparency
  - Slightly larger strings (~28 bytes base64)
- expo-image supports ThumbHash via `placeholder` prop

### Implementation with expo-image

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: spot.photo_url }}
  placeholder={{ blurhash: spot.blurhash }}
  transition={300}
  contentFit="cover"
  style={{ width: '100%', height: 200 }}
/>
```

### x/pat Recommendation

**Implement BlurHash for the premium feel.** This aligns with the Mercury banking fintech aesthetic -- liquid glass, smooth transitions. Steps:

1. **Generate BlurHash on upload**: After uploading a spot/post photo, generate the BlurHash and store it in the `spots` or `posts` table as a `blurhash` column.
2. **Migrate to expo-image**: Replace `<Image>` with expo-image's `<Image>` which supports `placeholder={{ blurhash }}` natively.
3. **Add 300ms crossDissolve transition**: `transition={300}` for smooth blur-to-sharp loading.
4. **Fallback**: For images without BlurHash (seeded data), use the existing Skeleton pulse animation.

Database migration needed:
```sql
ALTER TABLE spots ADD COLUMN blurhash text;
ALTER TABLE posts ADD COLUMN blurhash text;
```

---

## 15. Android Photo Grid Performance

### Current x/pat List Rendering

x/pat uses `FlatList` for all list screens (Feed, Spots, People). No photo grid view exists yet.

### FlatList vs FlashList vs LegendList (2026)

| Library | Rendering Strategy | Performance | Best For |
|---------|-------------------|-------------|----------|
| FlatList | Virtualization (create/destroy) | Good for <300 items | Simple lists |
| FlashList (Shopify) | Cell recycling (reuse) | 5-10x faster for large lists, 60fps at 10K+ | Photo grids, infinite scroll |
| LegendList | Fabric + Reanimated based | Newest, eliminates blank flashes | Cutting-edge lists |

### Key Optimization Props

```typescript
// FlatList optimization
<FlatList
  windowSize={10}           // Render 10 screens worth of items
  initialNumToRender={8}    // First render batch
  maxToRenderPerBatch={5}   // Items per scroll batch
  getItemLayout={...}       // Skip measurement if heights are fixed
  removeClippedSubviews={true}  // Android perf boost
/>
```

### FlashList for Photo Grids

```typescript
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={photos}
  numColumns={3}
  estimatedItemSize={120}  // Crucial for performance
  renderItem={renderPhoto}
/>
```

### x/pat Recommendation

**Use FlashList for any photo grid or large list.** If you add a photo gallery view (e.g., user's spots grid on profile, or spot detail photo gallery):

1. Install `@shopify/flash-list`
2. Use `numColumns={3}` for a standard photo grid
3. Set `estimatedItemSize` to the expected cell height
4. Combine with expo-image for cached, BlurHash-enabled image cells
5. For the FeedScreen (currently using FlatList), consider migrating to FlashList if feed items exceed 50-100 posts

---

## 16. Android Share Intent for Receiving Images

### What This Enables

Other apps (WhatsApp, Google Photos, Chrome) can share images TO x/pat. E.g., a user sees a cool cafe photo in their gallery and shares it directly to x/pat's "Add Spot" flow.

### expo-share-intent

The `expo-share-intent` library provides:
- Config plugin for Expo managed workflow
- MIME type filtering (`image/*`, `text/*`, etc.)
- `useShareIntent()` hook with `hasShareIntent`, `shareIntent`, `resetShareIntent`
- Deep linking integration with Expo Router
- Handles both single and multiple shared items

### Implementation

In `app.json`:
```json
{
  "plugins": [
    ["expo-share-intent", {
      "androidIntentFilters": ["image/*"]
    }]
  ]
}
```

In your component:
```typescript
import { useShareIntent } from 'expo-share-intent';

const { hasShareIntent, shareIntent } = useShareIntent();

useEffect(() => {
  if (hasShareIntent && shareIntent?.files?.[0]) {
    // Navigate to AddSpot with pre-filled photo
    navigation.navigate('AddSpot', { sharedImageUri: shareIntent.files[0].path });
  }
}, [hasShareIntent]);
```

### x/pat Recommendation

**Good future feature, not critical for launch.** This would let nomads share photos from their camera roll or WhatsApp directly to x/pat's AddSpot screen. Implementation is straightforward with `expo-share-intent`. Add to the roadmap for post-launch polish.

---

## 17. SVG Rendering on Android

### Current x/pat Usage

x/pat uses `react-native-svg` (v15.15.3) but does not appear to have custom SVG components in the codebase. Icons use `@expo/vector-icons` (Feather icon set) which renders via font glyphs, not SVG.

### SVG vs PNG on Android

| Factor | SVG | PNG |
|--------|-----|-----|
| File size | Smaller for simple shapes | Larger, need multiple densities |
| Rendering cost | JS bridge overhead on each render | Native, near-zero cost |
| Scaling | Perfect at any size | Blurry if wrong density |
| Animation | Possible but expensive | Sprite sheets possible |
| Color changes | Runtime via props | Need separate assets |

### Performance Considerations

- Simple SVGs (icons, logos): negligible performance difference
- Complex SVGs (100+ paths): measurable render time on Android, consider converting to PNG
- react-native-svg 15.x on New Architecture: improved performance with Fabric renderer

### x/pat Recommendation

**No changes needed.** x/pat uses Feather icons (font-based, not SVG), which is optimal for performance. If you add custom illustrations or the x/pat logo as SVG, react-native-svg handles it fine for simple shapes. For complex decorative illustrations, export as WebP instead.

---

## 18. Android Notification Images

### How Android Handles Notification Images

Android supports two image placements in notifications:
- **Large icon**: Small image on the right side (72x72 dp)
- **Big picture**: Full-width expanded image (up to 450 dp wide)

Android handles notification images **natively** -- no extra setup needed (unlike iOS which requires a Notification Service Extension).

### With Expo Notifications

expo-notifications does not directly support notification images in the local notification API. For **push notifications via Expo Push Service**, you include the image URL in the push payload, and Android's FCM handles the rest.

Push payload with image:
```json
{
  "to": "ExponentPushToken[...]",
  "title": "New spot shared!",
  "body": "Check out this cafe in Lisbon",
  "data": { "screen": "SpotDetail", "spotId": 123 },
  "android": {
    "imageUrl": "https://your-bucket.supabase.co/spot-photos/123.jpg"
  }
}
```

### Notifee (Alternative)

For more control, `@notifee/react-native` provides:
- Custom notification layouts
- Image attachments
- Progress bars
- Custom colors and actions

### x/pat Recommendation

**Use Expo Push Service's built-in image support.** When sending push notifications for new spots or feed posts, include the `android.imageUrl` field in the push payload. This requires no code changes in the app -- just update the server-side push notification logic to include the photo URL. This makes notifications more engaging and increases tap-through rates significantly.

---

## 19. GIF & Animated Image Support

### Android GIF Support in React Native

By default, GIF rendering is **not enabled** on Android in React Native. You must opt in by adding Fresco dependencies:

```groovy
// android/app/build.gradle
dependencies {
  implementation 'com.facebook.fresco:animated-gif:3.6.0'
}
```

### expo-image GIF Support

expo-image uses **Glide** on Android, which supports GIFs **out of the box** with no additional configuration. Another reason to migrate to expo-image.

### Animated WebP

Android supports animated WebP (API 14+), which offers:
- 25-35% smaller file sizes than GIF
- Better color depth (24-bit vs GIF's 8-bit)
- expo-image renders animated WebP natively via Glide

### x/pat Recommendation

**No GIF support needed currently.** x/pat is a travel/spot-sharing app, not a messaging app where GIF reactions are expected. If you add GIF support to chat/DMs later:
1. Use expo-image (Glide handles GIFs natively)
2. Consider animated WebP over GIF for smaller files
3. Set `autoplay={true}` and provide a static fallback frame
4. Use a GIF API like Giphy/Tenor with content moderation

---

## 20. Android File Size Limits

### AAB/APK Size Limits (2026)

| Format | Max Upload Size | Max Download Size |
|--------|----------------|-------------------|
| AAB | **200 MB** (increased from 150 MB in Jan 2026) | Varies per device (AAB optimizes) |
| APK (legacy) | 100 MB | 100 MB |
| Play Asset Delivery | 2 GB per pack | On-demand |

### Download Size Impact on Installs

**For every 6 MB increase in app size, install conversion rates decrease by ~1%.** This is critical for a startup app competing for installs.

### Current x/pat Size Estimate

Typical Expo SDK 55 app with the x/pat dependency set:
- React Native core: ~7-10 MB
- Hermes engine: ~3 MB
- expo modules (camera, location, maps, etc.): ~5-8 MB
- react-native-maps + Google Maps: ~5-7 MB
- react-native-reanimated: ~2 MB
- App code + bundled assets: ~2-5 MB
- **Estimated total AAB: ~25-35 MB**
- **Estimated download size: ~15-20 MB** (AAB optimization)

### x/pat Recommendation

**x/pat is well within limits.** The app is lean. To keep it that way:
1. Do not add FFmpeg for video processing (use react-native-compressor instead, ~50 KB vs ~9 MB)
2. Keep bundled assets minimal -- load images from Supabase CDN, not the bundle
3. Use WebP for any bundled images (splash screen, onboarding illustrations)
4. Monitor AAB size with each EAS build: `eas build --platform android` reports the size

---

## 21. Cloudflare Images / imgproxy Integration

### Options for Server-Side Image Optimization

| Service | Pricing | Features | Latency |
|---------|---------|----------|---------|
| Supabase Image Transforms | $5/1000 origins (Pro Plan) | Resize, quality, format auto | Edge CDN |
| Cloudflare Images | $5/100K images stored + $1/100K transformations | Full pipeline, variants, direct upload | Global edge |
| imgproxy | Self-hosted (free) or cloud | All transforms, AVIF/WebP, watermarks | Depends on deployment |

### Supabase Image Transformations (Simplest for x/pat)

Since x/pat already uses Supabase Storage, the built-in transforms are the easiest option:

```typescript
const { data } = supabase.storage
  .from('spot-photos')
  .getPublicUrl('user123/photo.jpg', {
    transform: {
      width: 400,
      height: 300,
      quality: 70,
      format: 'origin', // or 'avif' for Android
    },
  });
```

Benefits:
- No additional infrastructure
- Smart CDN caching at edge
- Automatic WebP conversion for supported clients
- Pay only for what you use

### Cloudflare Images (Scale Option)

For higher volume (post-launch scaling):
- Direct creator uploads with one-time tokens
- Named variants (thumbnail, card, hero) for consistent sizing
- Global edge delivery (<50ms TTFB worldwide)
- Automatic AVIF/WebP negotiation

### x/pat Recommendation

**Start with Supabase Image Transformations when upgrading to Pro Plan.** This eliminates the need for client-side compression entirely:
1. Upload original high-quality images
2. Request transformed URLs in the app: `getPublicUrl(path, { transform: { width: 800 } })`
3. Supabase caches transformed versions at CDN edge
4. Clients get optimized images automatically

For the free tier: continue with client-side compression (current approach works well).

---

## 22. Android WebP Support

### Native App Support

| Android Version | WebP Lossy | WebP Lossless | Animated WebP |
|-----------------|------------|---------------|---------------|
| API 14+ (4.0+) | Yes | No | No |
| API 18+ (4.3+) | Yes | Yes | Yes |
| API 21+ (5.0+) | Yes | Yes | Yes |

All Android devices that can run x/pat (minSdkVersion 23+) fully support WebP including lossless and animated variants.

### Browser vs Native Differences

- **Native apps**: Full WebP support on all relevant Android versions. Glide/Fresco decode WebP natively.
- **Chrome/WebView**: Full support since Chrome 32 (2014). 97%+ global browser support.
- **Email clients**: Poor WebP support -- email renders still prefer JPEG/PNG.
- **Social media sharing**: Some platforms re-encode shared WebP to JPEG. When sharing x/pat content externally, consider JPEG as the interchange format.

### x/pat Recommendation

**Switch spot/post photo uploads to WebP format.** Change in expo-image-manipulator:

```typescript
const manipulated = await ImageManipulator.manipulateAsync(
  pickedUri,
  [{ resize: { width: 1200 } }],
  { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP },
);
```

Benefits: 25-35% smaller files with identical visual quality. All x/pat users are on mobile (Android 6+ or iOS 14+), both of which fully support WebP. Upload the file with `contentType: 'image/webp'`.

---

## 23. Camera Permissions UX on Android

### Android Permission Behavior

- **First request**: System dialog appears. User can Allow or Deny.
- **Second request (after deny)**: System dialog appears with "Don't ask again" checkbox.
- **After "Don't ask again"**: `requestPermissionsAsync()` returns `denied` instantly. The only recovery is directing the user to Settings.
- **Android 11+**: If user denies a permission twice, the system automatically sets "Don't ask again" -- you only get two chances.

### Best Practice: Pre-Permission Screen (Soft Ask)

Never trigger the system dialog cold. Use a custom UI first:

1. User taps "Take Photo" or "Upload Photo"
2. Show a **custom modal** explaining why the permission is needed
3. If user taps "Allow", then trigger the system permission dialog
4. If user taps "Not Now", respect the decision and don't show the system dialog

### Settings Deep Link

When permissions are permanently denied, guide users to Settings:

```typescript
import { Linking, Platform } from 'react-native';

if (Platform.OS === 'android') {
  Linking.openSettings(); // Opens app's Settings page
}
```

### Current x/pat Behavior

- **useAvatar**: Requests camera permission inline (`requestCameraPermissionsAsync`). Shows an Alert if denied. Does NOT have a pre-permission screen.
- **FeedScreen**: Requests media library permission inline. Shows an Alert if denied.
- **AddSpotScreen**: No permission request at all -- expo-image-picker handles it via the system picker (no permission needed on Android 13+).

### x/pat Recommendation

**Add a pre-permission explanation for camera access.** In `useAvatar`, before calling `requestCameraPermissionsAsync`, show a custom Alert explaining why:

```
"x/pat uses your camera to take a profile photo that helps other nomads recognize you."
```

If permission is denied, show a message with a "Open Settings" button that calls `Linking.openSettings()`. This prevents the permanently-denied dead end.

For gallery access (FeedScreen), the system picker on Android 13+ handles everything -- no permission prompt needed. Consider removing the `requestMediaLibraryPermissionsAsync()` call from FeedScreen since it's unnecessary with the system picker.

---

## 24. Multiple Image Selection on Android

### expo-image-picker Multi-Select

expo-image-picker supports multiple image selection:

```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsMultipleSelection: true,
  selectionLimit: 5, // 0 = unlimited
  quality: 0.8,
});

if (!result.canceled) {
  const selectedImages = result.assets; // Array of assets
}
```

### Android System Photo Picker Multi-Select

On Android 13+, the system photo picker natively supports multi-select with a bottom sheet UI showing selected count. The user experience is smooth and familiar.

### Batch Upload UX Pattern

Best practices for multi-image upload:
1. Show thumbnails of all selected images with individual remove buttons
2. Display per-image upload progress
3. Allow reordering (drag to rearrange)
4. Process and compress images in parallel but upload sequentially
5. Handle partial failures (some succeed, some fail)
6. Show final status: "4 of 5 photos uploaded"

### Third-Party Multi-Select Libraries

If you need a custom gallery grid picker (not the system picker):
- `expo-images-picker`: Custom grid with checkmarks, supports resize and base64
- `expo-image-multiple-picker`: Fully customizable grid picker
- These are useful if you want an in-app gallery experience instead of leaving to the system picker

### x/pat Recommendation

**Add multi-image support to AddSpotScreen.** Spots often have multiple photos (interior, exterior, menu, workspace). Steps:

1. Enable `allowsMultipleSelection: true` with `selectionLimit: 5`
2. Show a horizontal scroll preview of selected images with X buttons to remove
3. Compress each image with the existing pipeline
4. Upload all images to `spot-photos/{userId}/{timestamp}-{index}.jpg`
5. Store as a JSON array in the `photo_urls` column (or add a `spot_photos` junction table)

This is a high-value UX improvement for a travel/spots app.

---

## 25. Image Accessibility on Android

### React Native Accessibility Props for Images

```typescript
<Image
  source={{ uri: spot.photo_url }}
  accessible={true}
  accessibilityLabel="Photo of Dojo Bali coworking space in Canggu"
  accessibilityRole="image"
/>
```

### Key Props

| Prop | Purpose | Android Mapping |
|------|---------|-----------------|
| `accessible={true}` | Makes element focusable by TalkBack | `focusable` + `importantForAccessibility` |
| `accessibilityLabel` | What TalkBack announces | `contentDescription` |
| `accessibilityRole="image"` | Tells TalkBack this is an image | Role announcement |
| `accessible={false}` | Hide decorative images from TalkBack | `importantForAccessibility="no"` |

### TalkBack Behavior

When a TalkBack user navigates to an image:
1. TalkBack announces: "Image. [accessibilityLabel text]"
2. If no label is set, TalkBack may say "Unlabeled image" (bad UX)
3. Decorative images should be hidden from TalkBack entirely

### Current x/pat Status

Reviewing the codebase, **no images have `accessibilityLabel` set**:
- `Avatar` component: No `accessibilityLabel` on the `<Image>` or fallback `<View>`
- `SpotCard`: No photo displayed (text only)
- `AddSpotScreen`: Photo preview has no label
- `FeedScreen`: Post photos have no labels

### x/pat Recommendation

**Add accessibility labels to all meaningful images.** This is both a UX improvement and a Play Store best practice. Specific changes:

1. **Avatar component**: Add `accessibilityLabel={name ? \`${name}'s profile photo\` : 'User profile photo'}` and `accessibilityRole="image"`

2. **Spot photos**: Add `accessibilityLabel={\`Photo of ${spot.name} in ${spot.city}\`}`

3. **Post photos**: Add `accessibilityLabel="Photo shared by [display_name]"`

4. **Decorative images** (splash, backgrounds): Add `accessible={false}`

5. **Photo upload buttons**: The "Add a photo" button in AddSpotScreen should have `accessibilityLabel="Add a photo of this spot"` and `accessibilityRole="button"`

---

## Priority Action Items for x/pat

### Critical (Do Before Next Build)

1. **Block READ_MEDIA_IMAGES/VIDEO permissions** in app.json to prevent Google Play rejection
2. **Add accessibility labels** to Avatar and image components

### High Priority (Next Sprint)

3. **Migrate from `<Image>` to expo-image** for caching, BlurHash, and Android performance
4. **Switch to WebP format** for uploads (25-35% smaller files)
5. **Add pre-permission screen** for camera access in useAvatar
6. **Standardize upload method** to blob-based (remove base64 path from FeedScreen)

### Medium Priority (Roadmap)

7. **Add BlurHash generation** on upload and store in database
8. **Enable multi-image selection** for AddSpotScreen (up to 5 photos per spot)
9. **Add notification images** to push notifications (spot/post photos)
10. **Migrate FeedScreen FlatList to FlashList** for better scroll performance

### Future Features

11. **Share intent support** (receive shared images from other apps)
12. **Video support** with react-native-compressor and TUS resumable uploads
13. **Server-side image transforms** via Supabase Pro Plan or Cloudflare Images
14. **Save to gallery** feature for spot photos

---

## Sources

- [Expo ImagePicker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [Expo ImageManipulator Documentation](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)
- [expo-image-picker READ_MEDIA Permissions Issue #42819](https://github.com/expo/expo/issues/42819)
- [expo-media-library READ_MEDIA Removal Issue #34662](https://github.com/expo/expo/issues/34662)
- [Google Play Photo and Video Permissions Policy](https://support.google.com/googleplay/android-developer/answer/14115180)
- [Play Store Rejection Discussion](https://support.google.com/googleplay/android-developer/thread/330810742)
- [expo-image-manipulator EXIF Stripping Issue #28913](https://github.com/expo/expo/issues/28913)
- [expo-image-picker EXIF Orientation Issues #2329](https://github.com/expo/expo/issues/2329)
- [Supabase Storage Uploads Documentation](https://supabase.com/docs/guides/storage/uploads)
- [Supabase Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase React Native Storage Blog](https://supabase.com/blog/react-native-storage)
- [react-native-compressor NPM](https://www.npmjs.com/package/react-native-compressor)
- [Mastering Media Uploads in React Native (2026 Guide)](https://dev.to/fasthedeveloper/mastering-media-uploads-in-react-native-images-videos-smart-compression-2026-guide-5g2i)
- [FlashList vs FlatList vs LegendList (2026)](https://www.pkgpulse.com/blog/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026)
- [FlatList Optimization for Large Lists](https://oneuptime.com/blog/post/2026-01-15-react-native-flatlist-optimization/view)
- [React Native Image List (Software Mansion)](https://blog.swmansion.com/react-native-image-list-recreating-apple-google-photos-in-react-native-part-1-7f73fb74fc63)
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent)
- [react-native-blurhash GitHub](https://github.com/mrousavy/react-native-blurhash)
- [BlurHash Project](https://blurha.sh/)
- [ThumbHash DEV Article](https://dev.to/vladimirvovk/better-image-placeholders-with-thumbhash-43mj)
- [WebP vs JPEG vs AVIF (2026)](https://blog.freeimages.com/post/webp-vs-jpeg-vs-avif-best-format-for-web-photos)
- [React Native Accessibility Documentation](https://reactnative.dev/docs/accessibility)
- [React Native Screen Reader Support Guide (2026)](https://oneuptime.com/blog/post/2026-01-15-react-native-screen-reader-support/view)
- [Android App Size Optimization](https://support.google.com/googleplay/android-developer/answer/9859372)
- [Android App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [Expo App Size Documentation](https://docs.expo.dev/distribution/app-size/)
- [Cloudflare Images Documentation](https://developers.cloudflare.com/images/)
- [Android Scoped Storage Guide](https://blog.notesnook.com/scoped-storage-in-react-native/)
- [Android MediaStore API](https://developer.android.com/reference/android/provider/MediaStore)
- [React Native Push Notifications Guide (2026)](https://devcom.com/tech-blog/react-native-push-notifications/)
- [Notifee Notifications Library](https://notifee.app/)
- [react-native-vision-camera Camera2 Rewrite PR](https://github.com/mrousavy/react-native-vision-camera/pull/1492)
- [Expo Permissions Documentation](https://docs.expo.dev/guides/permissions/)
- [WebP Browser Support (2026)](https://convertio.com/webp-to-jpg/browser-support)
- [React Native Image Caching Guide (2026)](https://oneuptime.com/blog/post/2026-01-15-react-native-image-caching/view)
- [Android Bitmap Caching Guide](https://developer.android.com/topic/performance/graphics/cache-bitmap)
