# dropbox-md-cms

> Super simple CMS to edit Markdown files in a Dropbox app folder

## Requirements

See `.nvmrc` or package file for the right Node version. If you use `nvm`:

```
$ nvm use
```

## Development

Create an app on Dropbox with App folder access only, generate an access token and put that in `.env`<sup>[1](#fn1)</sup>. Then install dependencies and run with Vercel (make sure you have an account and this repo is linked to a project):

```
$ npm ci
$ npx vercel dev
```

## Tech

- Built with and deploys to [Vercel](https://vercel.com/)
- TypeScript
- Uses Node native fetch even though it’s not recommended!!1
- No Dropbox SDK because why should I, also the Dropbox API is kind of weird

## Todo

-[ ] Implement Dropbox oAuth flow

## Notes

1. <a name="fn1"></a> Well, apparently long lived access tokens are [no longer a thing](https://www.dropboxforum.com/t5/Discuss-Dropbox-Developer-API/Long-term-expiration-Token/td-p/593327). Only solution is to build a proper oAuth login flow ¯\\\_(ツ)\_\/¯

## License

[MIT](license)
