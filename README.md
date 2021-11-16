Tunes
=====
This is the source code to tunes.fishsoup.net, a personal tunes notebook for me (Owen Taylor). Neither the application nor the website is likely useful for anyone else, but if you find it so, great!

Deployment
==========
`tools/build-container.sh` builds a container that exports the web app at port 8080. For production use, it should be run with a persistent directory mounted at `/srv/tunes-data`. This directory needs to contain `config.yaml` - see [config.example.yaml](./config.example.yaml).

The latest container can also be found at https://quay.io/repository/owtaylor/tunes

Development
===========
`tools/run-container.sh --live` runs the container so that live edits to the source code work.

License
=======
Tunes is copyright Owen Taylor, 2009-2021 and available under the terms of the MIT license.
