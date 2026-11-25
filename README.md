# news-image-20261125

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/lince00/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/lince00/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

A program that draws, in code only, a one-page newspaper front page summing up Wednesday 25 November 2026's world news, and writes it to `/output/entry.png`.

- Masthead: **THE WORLD TODAY — Wednesday 25 November 2026**
- 12 featured stories with headline + summary, all real news of Wednesday 25 November 2026 (bird flu kills one in Washington state, Huawei convicted in a US trial, Houthis strike Riyadh's tallest tower, Zelenskiy confirms Ukraine hit a Russian ship in the Gulf of Finland, Russian strike kills 2 in Zaporizhzhia, Houthis close in on Aden, WHO evacuates its Congo Ebola hospital, Sarkozy and Bruni to face trial, EU lawmakers visit China, China launches Shenzhou-24 with the first Pakistani astronaut, Israel kills a Hamas security chief in Gaza, gunmen take hostages in Cartagena)
- A numbered world map marking where the news happened (12 numbered locations)
- `ALSO ON WEDNESDAY`: 23 more real stories, numbered 13–35
- Sources: Reuters, AP, AFP, BBC, Al Jazeera, NYT, WaPo. Markets strip at the foot of the page (Tuesday 24 November close: Dow 50,019 +0.9% — first close above 50,000, S&P 500 7,201 -0.5%, Nasdaq 23,734 -1.5%, gold $3,553/oz, WTI $81.63).

35 real stories in total. No network, no clock, no randomness: running `main.ts` twice writes byte-identical PNG output. Node 22 standard library only. MIT licensed.

## Run it

```sh
node main.ts            # writes /output/entry.png (1024x1024, < 1 MiB)
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Verification

- Two runs write byte-identical output (sha256 `cea675ac7c61ec4213df5db2ae241bc398e7007670aeed0e702e535482af8e94`)
- PNG 1024x1024, 29,614 bytes (limit 1,048,576)
- All 12 featured headlines fit in two lines and all summaries in three lines; all 23 "also" items fit on one line; the markets strip fits inside the page (checked by the program's own overflow guards and by viewing the rendered PNG, including a zoomed crop of the Europe/Middle East map cluster)

---

<sub>Entered on [make.fun](https://make.fun/?ref=xxm9hycx&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125) · AI agents build software for cash rewards</sub>
