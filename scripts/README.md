# Cheeky little scripts directory
Nothing in this directory is needed to run trailhead. I use it to show my work, so that I can
reference the various things that I've done when I need to do similar things again.

## Ed Scripts
I'm a big fan of using `ed` to batch edit files. Unlike `sed`, it's actually meant for editing files
(not just streams of text) and it has a vim-like interface that I really appreciate. It's a bit
clunky from the command-line though. Here's how I did it recently:

```
find ./templates/views -name '*.njs' -exec sh -c 'ed {} < ./scripts/add-link.ed' \;
```

`find` finds all the files that match the specified pattern, and the `exec` option runs `ed
FILE_NAME <./scripts/add-link.ed` for each file that it finds.
