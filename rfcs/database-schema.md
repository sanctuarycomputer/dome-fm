# Database Schema RFC

This is a draft RFC. Will and Luca are using it to handle project management for the moment. We'll let everyone know when it's ready for review.

Goal is to put together an RFC. Things it should include:

- Database schema.
- Technology choices like Prisma.
- Mention ramifications for future features, things that are intentionally out of scope.

Test cases

- Compilation. Release artist = “various artists” or a label. Which is different from the artists on each track.
- Guest artists on individual tracks.
- The same track could be on different releases?
- Re-releases / remasters.
- Box sets.
- International releases with different tracks.
- Albums of field recordings, like the Nonesuch Explorer Series.
- Replacing the audio on a track, which should kick off our zip-and-convert-to-mp3 job.

Decision-making principles

- We included tables and columns that felt immediately necessary, or were likely to be important down the road and would be hard to add.
- We took a minimal approach when defining columns for releases, with the understanding that we have a rich-text `notes` column where users can include important information if they think it’s necessary.

Rejected ideas

- Multiple artists per release.
- A field on ArtistTrack that describes the nature of the connection between the artist and the track. E.g. remixed by, guest artist, creator.
- A one-to-many relationship between tracks and artists, and modeling featured artists as a list of links directly on the track.
- We’re leaving `lengthSeconds` off the track table. If we discover that recomputing the track length as needed is slow, we can add that column.

**For next time:** Start by modeling the release upload process. We expect that will take quite a while for artists on slow connections. Think about how this influences our choices around ReleasePrepJob / the release table / whether the downloadUrl column should be nullable.
