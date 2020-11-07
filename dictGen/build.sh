rm -rf data/
mkdir data && touch data/.gitkeep

if [[ $1 != "clean" ]]; then
node uniHan_pinyin.js
for fp in `ls data`; do
  echo $fp; (cd data && tail -c 2500 $fp | head -c 100)
  echo
  [[ -d ../docs/ucd ]] || mkdir -p ../docs/ucd
  node data2kv.js $fp > ../docs/ucd/`echo $fp|sed 's/.json//g'`.txt
done
fi
