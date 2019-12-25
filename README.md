
# Svelte-cr

Starter template for [Svelte](https://svelte.dev) frontend apps with Crystal-Lang [Kemal](https://kemalcr.com) backend server. 



## Requirements

NodeJs - [Install](https://nodejs.org/en/download/)

Crystal-Lang  - [Install](https://www.crystal-lang.org/install/) 


## Get started
Create a new project based on this template using [degit](https://github.com/Rich-Harris/degit) and 
install the dependencies...

```bash
npx degit sachinbhutani/svelte-cr svelte-cr
cd svelte-cr
npm install
```

...then start Kemal server and [Rollup](https://rollupjs.org) in two different terminals 

Terminal 1: (To run the kemal/crystal server)
```bash
crystal run src/svelte-cr.cr --progress
```
Terminal 2: (To build and hot reload svelte components)
```bash
npm run dev  
```

Navigate to [localhost:3000](http://localhost:3000). You should see your app running. 
All svelte component live in `client` directory. Save any changes live-reloading.
All Crystal code lives in `src` directory. To rebuild Crystal code use crystal run after saving your changes. 
All static files are served from `public` direcotry. Including the JS code compiled by Svelte Compiler.

![screenshot](https://github.com/sachinbhutani/svelte-cr/raw/master/screenshot.png)

## Building and running in production mode

To create an optimised version of the app:

```bash
npm run build
crystal build src/svelte-cr.cr --release
```

## Built With
[Crystal](https://crystal-lang.org/) 

[Kemal](https://kemalcr.com/)

[Svelte](https://svelte.dev/)

[YRV](https://github.com/pateketrueke/yrv) 

[Bulma](https://bulma.io)

## Change Log 
v0.1.0: Initial Release
