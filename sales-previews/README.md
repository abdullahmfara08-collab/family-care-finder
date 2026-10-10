# Sales previews

Hand-made preview pages for Clear Week's local website sales (not part of the Family Care Finder app). Each page is labeled as a preview and hidden from search engines. They are copied into the `clearweek-previews` Cloudflare Pages project on the Mac and served at `https://clearweek-previews.pages.dev/<file name without .html>`.

## Photos

Each page shows a photo gallery read from `photos/<site>/photos.json` on this branch (via raw.githubusercontent.com), so adding photos here updates the live page without redeploying it. Each photo is listed by `file`, with `w`, `h` and English/Spanish captions (`en`, `es`); `sm-<file>` is the smaller copy shown in the grid. Use only photos the owner approved.
