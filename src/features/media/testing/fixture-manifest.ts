import fs from "node:fs";
import path from "node:path";
import type { MediaManifest } from "../types";

/**
 * Hermetic fixture manifest for offline tests.
 * Decoupled from disk, filesystem state, and legacy invitation data modules.
 * Contains exactly 31 physical assets and 37 logical usages.
 */
export function createFixtureMediaManifest(): MediaManifest {
  return {
  "slugs": [
    "rika-fauzi",
    "shidqi-mita",
    "dudi-aini",
    "default-preview"
  ],
  "physicalAssets": [
    {
      "id": "ayawarta/production/invitations/rika-fauzi/couple/groom",
      "slug": "rika-fauzi",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/groom",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/FOTO - Fauzi.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 39975,
      "format": "jpg",
      "originalFileName": "FOTO - Fauzi.jpg",
      "reusedInUsages": [
        "rika-fauzi:couple:groom"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/couple/bride",
      "slug": "rika-fauzi",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/bride",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/FOTO - Rika Widiarti.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 52473,
      "format": "jpg",
      "originalFileName": "FOTO - Rika Widiarti.jpg",
      "reusedInUsages": [
        "rika-fauzi:couple:bride"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/couple/hero",
      "slug": "rika-fauzi",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/hero",
      "sourceType": "local",
      "sourceLocation": ".media-migration/input/images/rika-fauzi-hero.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 4151481,
      "format": "jpg",
      "originalFileName": "rika-fauzi-hero.jpg",
      "reusedInUsages": [
        "rika-fauzi:couple:hero",
        "rika-fauzi:gallery:06"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-01",
      "slug": "rika-fauzi",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-01",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/IMG-20250802-WA0006.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 77204,
      "format": "jpg",
      "originalFileName": "IMG-20250802-WA0006.jpg",
      "reusedInUsages": [
        "rika-fauzi:gallery:01"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-02",
      "slug": "rika-fauzi",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-02",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/IMG-20250802-WA0005.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 85523,
      "format": "jpg",
      "originalFileName": "IMG-20250802-WA0005.jpg",
      "reusedInUsages": [
        "rika-fauzi:gallery:02"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-03",
      "slug": "rika-fauzi",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-03",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/IMG-20250802-WA0007.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 76500,
      "format": "jpg",
      "originalFileName": "IMG-20250802-WA0007.jpg",
      "reusedInUsages": [
        "rika-fauzi:gallery:03"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-04",
      "slug": "rika-fauzi",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-04",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/IMG-20250802-WA0008.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 66015,
      "format": "jpg",
      "originalFileName": "IMG-20250802-WA0008.jpg",
      "reusedInUsages": [
        "rika-fauzi:gallery:04"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-05",
      "slug": "rika-fauzi",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-05",
      "sourceType": "local",
      "sourceLocation": "public/images/SAMPLE/IMG-20250802-WA0009.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 84204,
      "format": "jpg",
      "originalFileName": "IMG-20250802-WA0009.jpg",
      "reusedInUsages": [
        "rika-fauzi:gallery:05"
      ]
    },
    {
      "id": "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      "slug": "rika-fauzi",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      "sourceType": "local",
      "sourceLocation": ".media-migration/input/audio/rika-fauzi.mp3",
      "cloudinaryResourceType": "video",
      "byteSize": 7369389,
      "format": "mp3",
      "originalFileName": "rika-fauzi.mp3",
      "reusedInUsages": [
        "rika-fauzi:audio:item"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/couple/groom",
      "slug": "shidqi-mita",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/groom",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758636624/PWD_Shidqi_im7frp.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Shidqi_im7frp.jpg",
      "reusedInUsages": [
        "shidqi-mita:couple:groom"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/couple/bride",
      "slug": "shidqi-mita",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/bride",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758636621/PWD_Mita_xeonoq.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_xeonoq.jpg",
      "reusedInUsages": [
        "shidqi-mita:couple:bride"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/couple/hero",
      "slug": "shidqi-mita",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/hero",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758683815/couple_mnq0zf.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "couple_mnq0zf.jpg",
      "reusedInUsages": [
        "shidqi-mita:couple:hero"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-01",
      "slug": "shidqi-mita",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-01",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758633550/PWD_Mita_Shidqi-11_-_Shidqi_Nurpermadi_m4edz9.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_Shidqi-11_-_Shidqi_Nurpermadi_m4edz9.jpg",
      "reusedInUsages": [
        "shidqi-mita:gallery:01"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-02",
      "slug": "shidqi-mita",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-02",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758633577/PWD_Mita_Shidqi-15_-_Shidqi_Nurpermadi_yslkig.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_Shidqi-15_-_Shidqi_Nurpermadi_yslkig.jpg",
      "reusedInUsages": [
        "shidqi-mita:gallery:02"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-03",
      "slug": "shidqi-mita",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-03",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758633550/PWD_Mita_Shidqi-6_-_Shidqi_Nurpermadi_hfa8yt.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_Shidqi-6_-_Shidqi_Nurpermadi_hfa8yt.jpg",
      "reusedInUsages": [
        "shidqi-mita:gallery:03"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-04",
      "slug": "shidqi-mita",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-04",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758633592/PWD_Mita_Shidqi-26_-_Shidqi_Nurpermadi_txf0mo.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_Shidqi-26_-_Shidqi_Nurpermadi_txf0mo.jpg",
      "reusedInUsages": [
        "shidqi-mita:gallery:04"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-05",
      "slug": "shidqi-mita",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-05",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758633588/PWD_Mita_Shidqi-19_-_Shidqi_Nurpermadi_cxl1ba.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_Shidqi-19_-_Shidqi_Nurpermadi_cxl1ba.jpg",
      "reusedInUsages": [
        "shidqi-mita:gallery:05"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-06",
      "slug": "shidqi-mita",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-06",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1758633549/PWD_Mita_Shidqi-5_-_Shidqi_Nurpermadi_znxxvw.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "PWD_Mita_Shidqi-5_-_Shidqi_Nurpermadi_znxxvw.jpg",
      "reusedInUsages": [
        "shidqi-mita:gallery:06"
      ]
    },
    {
      "id": "ayawarta/production/invitations/shidqi-mita/audio/background-music",
      "slug": "shidqi-mita",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/audio/background-music",
      "sourceType": "local",
      "sourceLocation": ".media-migration/input/audio/shidqi-mita.mp3",
      "cloudinaryResourceType": "video",
      "byteSize": 2263386,
      "format": "mp3",
      "originalFileName": "shidqi-mita.mp3",
      "reusedInUsages": [
        "shidqi-mita:audio:item"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/couple/groom",
      "slug": "dudi-aini",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/couple/groom",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1763485132/dudi_aiwaeh.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "dudi_aiwaeh.jpg",
      "reusedInUsages": [
        "dudi-aini:couple:groom"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/couple/bride",
      "slug": "dudi-aini",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/couple/bride",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1763485132/aini_ru5pui.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "aini_ru5pui.jpg",
      "reusedInUsages": [
        "dudi-aini:couple:bride"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/couple/hero",
      "slug": "dudi-aini",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/couple/hero",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1765164240/hero_byywfn.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "hero_byywfn.jpg",
      "reusedInUsages": [
        "dudi-aini:couple:hero"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/gallery/gallery-01",
      "slug": "dudi-aini",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/gallery/gallery-01",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1763484805/heroImage_blhgl5.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "heroImage_blhgl5.jpg",
      "reusedInUsages": [
        "dudi-aini:gallery:01"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/gallery/gallery-02",
      "slug": "dudi-aini",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/gallery/gallery-02",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1763484805/2_ladbgf.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "2_ladbgf.jpg",
      "reusedInUsages": [
        "dudi-aini:gallery:02"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/gallery/gallery-03",
      "slug": "dudi-aini",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/gallery/gallery-03",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/image/upload/v1764585361/foto_4_w4msfb.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": null,
      "format": "jpg",
      "originalFileName": "foto_4_w4msfb.jpg",
      "reusedInUsages": [
        "dudi-aini:gallery:03"
      ]
    },
    {
      "id": "ayawarta/production/invitations/dudi-aini/audio/background-music",
      "slug": "dudi-aini",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/audio/background-music",
      "sourceType": "remote",
      "sourceLocation": "https://res.cloudinary.com/doig3gwek/video/upload/v1764532212/lagu_ruirls.mp3",
      "cloudinaryResourceType": "video",
      "byteSize": null,
      "format": "mp3",
      "originalFileName": "lagu_ruirls.mp3",
      "reusedInUsages": [
        "dudi-aini:audio:item"
      ]
    },
    {
      "id": "ayawarta/production/invitations/default-preview/couple/groom",
      "slug": "default-preview",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/default-preview/couple/groom",
      "sourceType": "local",
      "sourceLocation": "public/images/dummy-couples/groom.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 14694,
      "format": "jpg",
      "originalFileName": "groom.jpg",
      "reusedInUsages": [
        "default-preview:couple:groom"
      ]
    },
    {
      "id": "ayawarta/production/invitations/default-preview/couple/bride",
      "slug": "default-preview",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/default-preview/couple/bride",
      "sourceType": "local",
      "sourceLocation": "public/images/dummy-couples/bride.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 6496,
      "format": "jpg",
      "originalFileName": "bride.jpg",
      "reusedInUsages": [
        "default-preview:couple:bride"
      ]
    },
    {
      "id": "ayawarta/production/invitations/default-preview/couple/hero",
      "slug": "default-preview",
      "category": "couple",
      "targetPublicId": "ayawarta/production/invitations/default-preview/couple/hero",
      "sourceType": "local",
      "sourceLocation": "public/images/dummy-couples/hero.png",
      "cloudinaryResourceType": "image",
      "byteSize": 91606,
      "format": "png",
      "originalFileName": "hero.png",
      "reusedInUsages": [
        "default-preview:couple:hero"
      ]
    },
    {
      "id": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "slug": "default-preview",
      "category": "gallery",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "sourceType": "local",
      "sourceLocation": "public/images/dummy-couples/photo-sample.jpg",
      "cloudinaryResourceType": "image",
      "byteSize": 205219,
      "format": "jpg",
      "originalFileName": "photo-sample.jpg",
      "reusedInUsages": [
        "default-preview:gallery:01",
        "default-preview:gallery:02",
        "default-preview:gallery:03",
        "default-preview:gallery:04",
        "default-preview:gallery:05",
        "default-preview:gallery:06"
      ]
    },
    {
      "id": "ayawarta/production/invitations/default-preview/audio/background-music",
      "slug": "default-preview",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/default-preview/audio/background-music",
      "sourceType": "local",
      "sourceLocation": ".media-migration/input/audio/default-preview.mp3",
      "cloudinaryResourceType": "video",
      "byteSize": 2263386,
      "format": "mp3",
      "originalFileName": "default-preview.mp3",
      "reusedInUsages": [
        "default-preview:audio:item"
      ]
    }
  ],
  "logicalUsages": [
    {
      "usageId": "rika-fauzi:couple:groom",
      "slug": "rika-fauzi",
      "category": "couple",
      "role": "groom",
      "altText": "Foto Mempelai Pria: Moch Fauzi Febriana",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/groom",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:couple:bride",
      "slug": "rika-fauzi",
      "category": "couple",
      "role": "bride",
      "altText": "Foto Mempelai Wanita: Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/bride",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:couple:hero",
      "slug": "rika-fauzi",
      "category": "couple",
      "role": "hero",
      "altText": "Foto Utama Pasangan Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/hero",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:gallery:01",
      "slug": "rika-fauzi",
      "category": "gallery",
      "position": 1,
      "altText": "Foto Galeri 1: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-01",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:gallery:02",
      "slug": "rika-fauzi",
      "category": "gallery",
      "position": 2,
      "altText": "Foto Galeri 2: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-02",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:gallery:03",
      "slug": "rika-fauzi",
      "category": "gallery",
      "position": 3,
      "altText": "Foto Galeri 3: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-03",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:gallery:04",
      "slug": "rika-fauzi",
      "category": "gallery",
      "position": 4,
      "altText": "Foto Galeri 4: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-04",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:gallery:05",
      "slug": "rika-fauzi",
      "category": "gallery",
      "position": 5,
      "altText": "Foto Galeri 5: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/gallery/gallery-05",
      "isReused": false
    },
    {
      "usageId": "rika-fauzi:gallery:06",
      "slug": "rika-fauzi",
      "category": "gallery",
      "position": 6,
      "altText": "Foto Galeri 6: Momen Bahagia Moch Fauzi Febriana dan Rika Widiarti",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/hero",
      "isReused": true,
      "reuseNotes": "Reuses asset 'ayawarta/production/invitations/rika-fauzi/couple/hero' from source '.media-migration/input/images/rika-fauzi-hero.jpg'"
    },
    {
      "usageId": "rika-fauzi:audio:item",
      "slug": "rika-fauzi",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:couple:groom",
      "slug": "shidqi-mita",
      "category": "couple",
      "role": "groom",
      "altText": "Foto Mempelai Pria: Shidqi Nurpermadi",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/groom",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:couple:bride",
      "slug": "shidqi-mita",
      "category": "couple",
      "role": "bride",
      "altText": "Foto Mempelai Wanita: Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/bride",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:couple:hero",
      "slug": "shidqi-mita",
      "category": "couple",
      "role": "hero",
      "altText": "Foto Utama Pasangan Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/hero",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:gallery:01",
      "slug": "shidqi-mita",
      "category": "gallery",
      "position": 1,
      "altText": "Foto Galeri 1: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-01",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:gallery:02",
      "slug": "shidqi-mita",
      "category": "gallery",
      "position": 2,
      "altText": "Foto Galeri 2: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-02",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:gallery:03",
      "slug": "shidqi-mita",
      "category": "gallery",
      "position": 3,
      "altText": "Foto Galeri 3: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-03",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:gallery:04",
      "slug": "shidqi-mita",
      "category": "gallery",
      "position": 4,
      "altText": "Foto Galeri 4: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-04",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:gallery:05",
      "slug": "shidqi-mita",
      "category": "gallery",
      "position": 5,
      "altText": "Foto Galeri 5: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-05",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:gallery:06",
      "slug": "shidqi-mita",
      "category": "gallery",
      "position": 6,
      "altText": "Foto Galeri 6: Momen Bahagia Shidqi Nurpermadi dan Mita Ali Tifta",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/gallery/gallery-06",
      "isReused": false
    },
    {
      "usageId": "shidqi-mita:audio:item",
      "slug": "shidqi-mita",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/shidqi-mita/audio/background-music",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:couple:groom",
      "slug": "dudi-aini",
      "category": "couple",
      "role": "groom",
      "altText": "Foto Mempelai Pria: Dudi",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/couple/groom",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:couple:bride",
      "slug": "dudi-aini",
      "category": "couple",
      "role": "bride",
      "altText": "Foto Mempelai Wanita: Aini Sri Lutami",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/couple/bride",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:couple:hero",
      "slug": "dudi-aini",
      "category": "couple",
      "role": "hero",
      "altText": "Foto Utama Pasangan Dudi dan Aini Sri Lutami",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/couple/hero",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:gallery:01",
      "slug": "dudi-aini",
      "category": "gallery",
      "position": 1,
      "altText": "Foto Galeri 1: Momen Bahagia Dudi dan Aini Sri Lutami",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/gallery/gallery-01",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:gallery:02",
      "slug": "dudi-aini",
      "category": "gallery",
      "position": 2,
      "altText": "Foto Galeri 2: Momen Bahagia Dudi dan Aini Sri Lutami",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/gallery/gallery-02",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:gallery:03",
      "slug": "dudi-aini",
      "category": "gallery",
      "position": 3,
      "altText": "Foto Galeri 3: Momen Bahagia Dudi dan Aini Sri Lutami",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/gallery/gallery-03",
      "isReused": false
    },
    {
      "usageId": "dudi-aini:audio:item",
      "slug": "dudi-aini",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/dudi-aini/audio/background-music",
      "isReused": false
    },
    {
      "usageId": "default-preview:couple:groom",
      "slug": "default-preview",
      "category": "couple",
      "role": "groom",
      "altText": "Foto Mempelai Pria: Bima Mahendra",
      "targetPublicId": "ayawarta/production/invitations/default-preview/couple/groom",
      "isReused": false
    },
    {
      "usageId": "default-preview:couple:bride",
      "slug": "default-preview",
      "category": "couple",
      "role": "bride",
      "altText": "Foto Mempelai Wanita: Anisa Putri",
      "targetPublicId": "ayawarta/production/invitations/default-preview/couple/bride",
      "isReused": false
    },
    {
      "usageId": "default-preview:couple:hero",
      "slug": "default-preview",
      "category": "couple",
      "role": "hero",
      "altText": "Foto Utama Pasangan Bima Mahendra dan Anisa Putri",
      "targetPublicId": "ayawarta/production/invitations/default-preview/couple/hero",
      "isReused": false
    },
    {
      "usageId": "default-preview:gallery:01",
      "slug": "default-preview",
      "category": "gallery",
      "position": 1,
      "altText": "Foto Galeri 1: Contoh Foto Undangan Pernikahan",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "isReused": false
    },
    {
      "usageId": "default-preview:gallery:02",
      "slug": "default-preview",
      "category": "gallery",
      "position": 2,
      "altText": "Foto Galeri 2: Contoh Foto Undangan Pernikahan",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "isReused": true,
      "reuseNotes": "Reuses asset 'ayawarta/production/invitations/default-preview/gallery/gallery-01' from source 'public/images/dummy-couples/photo-sample.jpg'"
    },
    {
      "usageId": "default-preview:gallery:03",
      "slug": "default-preview",
      "category": "gallery",
      "position": 3,
      "altText": "Foto Galeri 3: Contoh Foto Undangan Pernikahan",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "isReused": true,
      "reuseNotes": "Reuses asset 'ayawarta/production/invitations/default-preview/gallery/gallery-01' from source 'public/images/dummy-couples/photo-sample.jpg'"
    },
    {
      "usageId": "default-preview:gallery:04",
      "slug": "default-preview",
      "category": "gallery",
      "position": 4,
      "altText": "Foto Galeri 4: Contoh Foto Undangan Pernikahan",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "isReused": true,
      "reuseNotes": "Reuses asset 'ayawarta/production/invitations/default-preview/gallery/gallery-01' from source 'public/images/dummy-couples/photo-sample.jpg'"
    },
    {
      "usageId": "default-preview:gallery:05",
      "slug": "default-preview",
      "category": "gallery",
      "position": 5,
      "altText": "Foto Galeri 5: Contoh Foto Undangan Pernikahan",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "isReused": true,
      "reuseNotes": "Reuses asset 'ayawarta/production/invitations/default-preview/gallery/gallery-01' from source 'public/images/dummy-couples/photo-sample.jpg'"
    },
    {
      "usageId": "default-preview:gallery:06",
      "slug": "default-preview",
      "category": "gallery",
      "position": 6,
      "altText": "Foto Galeri 6: Contoh Foto Undangan Pernikahan",
      "targetPublicId": "ayawarta/production/invitations/default-preview/gallery/gallery-01",
      "isReused": true,
      "reuseNotes": "Reuses asset 'ayawarta/production/invitations/default-preview/gallery/gallery-01' from source 'public/images/dummy-couples/photo-sample.jpg'"
    },
    {
      "usageId": "default-preview:audio:item",
      "slug": "default-preview",
      "category": "audio",
      "targetPublicId": "ayawarta/production/invitations/default-preview/audio/background-music",
      "isReused": false
    }
  ],
  "unresolvedMusicBlockers": [],
  "summary": {
    "totalSlugs": 4,
    "totalPhysicalAssets": 31,
    "totalLogicalUsages": 37,
    "totalLocalAssets": 15,
    "totalRemoteAssets": 16,
    "totalImages": 27,
    "totalAudio": 4,
    "totalVideo": 0,
    "unresolvedExternalMusicCount": 0,
    "collisionsDetected": 0,
    "missingLocalFilesCount": 0,
    "slugBreakdown": {
      "rika-fauzi": {
        "physicalAssets": 9,
        "logicalUsages": 10,
        "unresolvedMusic": 0,
        "heroTargetPublicId": "ayawarta/production/invitations/rika-fauzi/couple/hero"
      },
      "shidqi-mita": {
        "physicalAssets": 10,
        "logicalUsages": 10,
        "unresolvedMusic": 0,
        "heroTargetPublicId": "ayawarta/production/invitations/shidqi-mita/couple/hero"
      },
      "dudi-aini": {
        "physicalAssets": 7,
        "logicalUsages": 7,
        "unresolvedMusic": 0,
        "heroTargetPublicId": "ayawarta/production/invitations/dudi-aini/couple/hero"
      },
      "default-preview": {
        "physicalAssets": 5,
        "logicalUsages": 10,
        "unresolvedMusic": 0,
        "heroTargetPublicId": "ayawarta/production/invitations/default-preview/couple/hero"
      }
    }
  }
} as unknown as MediaManifest;
}

/**
 * Populates stub local files matching the manifest's 15 local source locations in targetDir.
 * Allows hermetic testing of uploaders without touching repository roots or ignored folders.
 */
export function setupFixtureLocalFiles(targetDir: string): void {
  const manifest = createFixtureMediaManifest();
  for (const asset of manifest.physicalAssets) {
    if (asset.sourceType === "local") {
      const fullPath = path.resolve(targetDir, asset.sourceLocation);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, Buffer.alloc(asset.byteSize ?? 100, 0x20));
      }
    }
  }
}
