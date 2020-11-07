cachedDownloadUnzip() {
  local cache=./cache/
  [[ -d ${cache} ]] || mkdir cache
  [[ -f ${cache}$1 ]] || curl -o ${cache}$1 $2
  [[ `ls -1 ${cache}|wc -l` == 1 ]] && unzip -n ./cache/$1 -d ./cache
}

cachedDownloadUnzip "Unihan.zip" "https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip"
