ruby -E UTF-8 -e "require 'irb'; IRB.init_config(''); extend IRB::ExtendCommandBundle" \
  -e "require 'sinatra'; set :static, false;" \
  -e "get('*') { headers 'Access-Control-Allow-Origin' => '*'; fp=URI.decode_www_form_component request.path.delete_prefix! '/'; if fp.end_with?'.js'; response.headers['Content-Type']='text/javascript'; end; body File.read(fp) }"
# URI.unescape is... obsoleted?