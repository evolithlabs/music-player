import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/sqlite';
import { getDbInstance } from 'src/db';
import type { DatabaseAlbum, DatabaseArtist, DatabaseTrack } from 'src/types/db';
import type { LocalTrack } from 'src/types/local';

export const useLocalDB = () => {
  const getTracksCount = async () => {
    const db = await getDbInstance();

    const countRow = await db
      .selectFrom('tracks')
      .select(db.fn.countAll().as('count'))
      .executeTakeFirst();
    return countRow?.count;
  };

  const fetchTracks = async (limit: number, offset: number) => {
    const db = await getDbInstance();

    return await db
      .selectFrom('tracks')
      .select((eb) => [
        'id',
        'album_id',
        'duration',
        'cover_path',
        'name',
        'path',
        'spotify_id',
        'year',
        'local_id',
        jsonObjectFrom(
          eb
            .selectFrom('albums')
            .select(['id', 'name'])
            .whereRef('albums.id', '=', 'tracks.album_id')
            .orderBy('albums.name'),
        ).as('album'),
        jsonArrayFrom(
          eb
            .selectFrom('artists')
            .innerJoin('tracks_artists', 'tracks_artists.artist_id', 'artists.id')
            .whereRef('tracks_artists.track_id', '=', 'tracks.id')
            .select(['artists.id', 'artists.name'])
            .orderBy('artists.name'),
        ).as('artists'),
      ])
      .orderBy('name')
      .limit(limit)
      .offset(offset)
      .execute();
  };

  const fetchAlbums = async (limit: number, offset: number) => {
    const db = await getDbInstance();

    return await db
      .selectFrom('albums')
      .select((eb) => [
        'id',
        'name',
        'cover_path',
        jsonObjectFrom(
          eb
            .selectFrom('tracks')
            .whereRef('albums.id', '=', 'tracks.album_id')
            .select(db.fn.countAll().as('count')),
        ).as('tracks'),
        jsonArrayFrom(
          eb
            .selectFrom('artists')
            .innerJoin('albums_artists', 'albums.id', 'albums_artists.album_id')
            .whereRef('albums_artists.artist_id', '=', 'artists.id')
            .select(['name']),
        ).as('artists'),
      ])
      .orderBy('name')
      .limit(limit)
      .offset(offset)
      .execute();
  };

  const fetchArtists = async (limit: number, offset: number) => {
    const db = await getDbInstance();

    return await db
      .selectFrom('artists')
      .select((eb) => [
        'id',
        'name',
        'spotify_id',
        jsonObjectFrom(
          eb
            .selectFrom('tracks')
            .innerJoin('tracks_artists', 'tracks.id', 'tracks_artists.track_id')
            .whereRef('tracks_artists.artist_id', '=', 'artists.id')
            .select(db.fn.countAll().as('count')),
        ).as('tracks'),
        jsonObjectFrom(
          eb
            .selectFrom('albums')
            .innerJoin('albums_artists', 'artists.id', 'albums_artists.artist_id')
            .whereRef('albums_artists.album_id', '=', 'albums.id')
            .select(db.fn.countAll().as('count')),
        ).as('albums'),
      ])
      .orderBy('name')
      .limit(limit)
      .offset(offset)
      .execute();
  };

  const syncTrackData = async (track: LocalTrack) => {
    const db = await getDbInstance();

    const dbTrackId = await saveTrack(track);
    const dbAlbumId = await saveAlbum(track);
    const dbTrackArtistIds = await saveTrackArtists(track);
    const dbAlbumArtistIds = await saveAlbumArtists(track);

    // Add album to the track
    if (dbTrackId && dbAlbumId) {
      // Set track - album relation
      await db
        .updateTable('tracks')
        .set({ album_id: dbAlbumId })
        .where('id', '=', dbTrackId)
        .execute();
    }

    // Add artists to the track
    if (dbTrackId && dbTrackArtistIds?.length) {
      for (let i = 0; i < dbTrackArtistIds.length; i++) {
        const dbArtistId = dbTrackArtistIds[i];
        if (dbArtistId) {
          const dbTrackArtistId = await db
            .selectFrom('tracks_artists')
            .where('track_id', '=', dbTrackId)
            .where('artist_id', '=', dbArtistId)
            .select('id')
            .executeTakeFirst();
          if (!dbTrackArtistId) {
            // Relation doesn't yet exist - create a new one
            await db
              .insertInto('tracks_artists')
              .values({
                track_id: dbTrackId,
                artist_id: dbArtistId,
              })
              .execute();
          }
        }
      }
    }

    // Add artists to the album
    if (dbAlbumId && dbAlbumArtistIds?.length) {
      for (let i = 0; i < dbAlbumArtistIds.length; i++) {
        const dbArtistId = dbAlbumArtistIds[i];
        if (dbArtistId) {
          const dbAlbumArtistId = await db
            .selectFrom('albums_artists')
            .where('album_id', '=', dbAlbumId)
            .where('artist_id', '=', dbArtistId)
            .select('id')
            .executeTakeFirst();
          if (!dbAlbumArtistId) {
            // Relation doesn't yet exist - create a new one
            await db
              .insertInto('albums_artists')
              .values({
                album_id: dbAlbumId,
                artist_id: dbArtistId,
              })
              .execute();
          }
        }
      }
    }
  };

  const saveTrack = async (track: LocalTrack) => {
    const db = await getDbInstance();

    // Find/Create track
    let dbTrackId: DatabaseTrack['id'];
    if (track.spotify_id) {
      // Find the track based on spotify_id
      dbTrackId = (
        await db
          .selectFrom('tracks')
          .select('id')
          .where('spotify_id', '=', track.spotify_id.trim())
          .executeTakeFirst()
      )?.id;
    }

    if (!dbTrackId) {
      // Find the track based on local_id
      dbTrackId = (
        await db
          .selectFrom('tracks')
          .select('id')
          .where('local_id', '=', track.id)
          .executeTakeFirst()
      )?.id;
    }

    if (!dbTrackId) {
      // It's a new track - not yet stored in db, so we create
      dbTrackId = Number(
        (
          await db
            .insertInto('tracks')
            .values({
              name: null, // just for creation, we fill the data in he next step
            })
            .executeTakeFirst()
        ).insertId,
      );
    }

    // Fill track data
    await db
      .updateTable('tracks')
      .set({
        name: track.name.trim(),
        duration: track.duration,
        cover_path: track.coverPath,
        path: track.path,
        local_id: track.id,
        spotify_id: track.spotify_id?.trim(),
        year: track.year,
      })
      .where('id', '=', dbTrackId)
      .execute();

    return dbTrackId;
  };

  const saveAlbum = async (track: LocalTrack) => {
    if (!track.album || track.album.length <= 0) return;

    const db = await getDbInstance();

    let dbAlbumId: DatabaseAlbum['id'];
    // Find the album based on spotify_id || name
    dbAlbumId = (
      await db
        .selectFrom('albums')
        .select('id')
        .where((eb) => {
          if (track.album) {
            return eb('spotify_id', '=', track.album_id?.trim() ?? null).or(
              'name',
              '=',
              track.album.trim(),
            );
          } else {
            return eb('spotify_id', '=', track.album_id?.trim() ?? null);
          }
        })
        .executeTakeFirst()
    )?.id;

    if (!dbAlbumId && track.album) {
      // Album does not yet exist in db - Create a new album
      dbAlbumId = Number(
        (
          await db
            .insertInto('albums')
            .values({
              name: track.album.trim(),
              cover_path: track.coverPath,
              spotify_id: track.album_id?.trim() ?? null,
            })
            .executeTakeFirst()
        ).insertId,
      );
    }

    return dbAlbumId;
  };

  const saveTrackArtists = async (track: LocalTrack) => {
    // Find/Create artist
    const dbArtistIds: DatabaseArtist['id'][] = [];
    if (track.artist && track.artist_id) {
      const ids = track.artist_id.split(','); // artist_id = "drt7asdiad, 78asd8fd778, etc..."
      const names = track.artist.split(','); // artist = "NF, MGK, etc..."
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const name = names[i];
        const artist = await saveArtist(id, name);

        if (artist) dbArtistIds.push(artist);
      }
    }
    return dbArtistIds;
  };

  const saveAlbumArtists = async (track: LocalTrack) => {
    // Find/Create artist
    const dbArtistIds: DatabaseArtist['id'][] = [];
    if (track.album_artist && track.album_artist_id) {
      const ids = track.album_artist_id.split(','); // artist_id = "drt7asdiad, 78asd8fd778, etc..."
      const names = track.album_artist.split(','); // artist = "NF, MGK, etc..."
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const name = names[i];
        const artist = await saveArtist(id, name);

        if (artist) dbArtistIds.push(artist);
      }
    }

    return dbArtistIds;
  };

  const saveArtist = async (spotifyId: string | undefined, name: string | undefined) => {
    const db = await getDbInstance();

    // Find/Create artist
    let dbArtistId: DatabaseArtist['id'] | undefined;
    if (spotifyId || name) {
      // Find the album based on spotify_id || name
      dbArtistId = (
        await db
          .selectFrom('artists')
          .select('id')
          .where((eb) =>
            eb('spotify_id', '=', spotifyId?.trim() ?? null).or('name', '=', name ?? null),
          )
          .executeTakeFirst()
      )?.id;
    }

    if (!dbArtistId && name) {
      // Artist does not yet exist in db - Create a new artist
      dbArtistId = Number(
        (
          await db
            .insertInto('artists')
            .values({
              name: name,
              spotify_id: spotifyId?.trim() ?? null,
            })
            .executeTakeFirst()
        ).insertId,
      );
    }

    return dbArtistId;
  };

  return { syncTrackData, fetchTracks, getTracksCount, fetchAlbums, fetchArtists };
};
