import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';
import eaw from 'eastasianwidth';
import { user_record } from 'NeteaseCloudMusicApi';
import generateBarChart from './generateBarChart';
import truncateString from './truncateString';

config();

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  USER_ID: userId,
  USER_TOKEN: userToken,
} = process.env;

(async () => {
  /**
   * First, get user record
   */

  const record = await user_record({
    cookie: `MUSIC_U=${userToken}`,
    uid: userId,
    type: 1, // last week
  }).catch(error => console.error(`Unable to get user record \n${error}`));

  /**
   * Second, get week play data and parse into song/plays diagram
   */

  let totalPlayCount = 0;
  const { weekData } = record.body;
  weekData.forEach(data => {
    totalPlayCount += data.playCount;
  });

  const lines = weekData.slice(0, 5).reduce((prev, cur) => {
    const playCount = cur.playCount;
    let name = truncateString(cur.song.name, 25, true);

    const line = [
      name.padEnd(26 + name.length - eaw.length(name)),
      generateBarChart(playCount * 100 / totalPlayCount, 17),
      `${playCount}`.padStart(5),
      'plays',
    ];

    return [...prev, line.join(' ')];
  }, []);

  /**
   * Finally, write into gist
   */

  try {
    const octokit = new Octokit({
      auth: `token ${githubToken}`,
    });
    const gist = await octokit.gists.get({
      gist_id: gistId,
    });

    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `🎵 My last week in music`,
          content: lines.join('\n'),
        },
      },
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
})();