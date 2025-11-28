# Placeholder Resume

This is a placeholder file for local development.

During CI build, this will be replaced with the actual resume generated from `data/kenzik.yml`.

## To test locally

Run the Python build script:

```bash
cd python
python build_resume.py --format all --name kenzik-resume --source ../data/kenzik.yml
cp kenzik-resume.* ../web/public/downloads/
```

Then restart the dev server.

