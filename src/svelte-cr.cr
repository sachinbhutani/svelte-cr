module Svelte::Cr
  VERSION = "0.1.0"
end

require "kemal"
require "kemal-session"


Kemal::Session.config do |config|
  config.secret = "something_very_secret"
end


get "/" do |env|
  send_file(env, "./public/index.html", "text/html")
end  

get "/api" do
  "Hello, from Crystal \n Hit the back button to continue"
end


get "/api/message" do |env|
  env.response.content_type = "application/json"
  {
    app: "svelte-cr",
    version: "0.0.1",
    status: "Feeling Good"
  }.to_json
end


get "/api/checkuser" do |env|
  username = env.session.string?("user_id")
  env.response.content_type = "application/json"
  case username
    when Nil 
      {user_id: "_"}.to_json
    else
      {user_id: "#{username}"}.to_json
  end
end 

get "/api/secure" do |env|
  env.response.content_type = "application/json"
  if env.session.string?("user_id")
    {result: "success", message: "this is your ultra secret private data"}.to_json
  else
    {result: "error", message: "no cookies for you - bad guy!!"}.to_json
  end 
end

get "/app/common" do |env|
  env.response.content_type = "application/json"
  { app: "svelte-cr",
    version: "0.0.1",
    status: "Feeling Good"
  }.to_json
end 

# The request content type needs to be application/json
post "/auth/login" do |env|
  username = env.params.json["username"].as(String)
  password = env.params.json["password"].as(String)
  env.response.content_type = "application/json"
  if username == password 
    env.session.string("user_id", username)
    { result: "success", messge: "login successfull"}.to_json
  else 
    { result: "error", message: "Invalid Username/Password"}.to_json
  end
end 

get "/auth/logout" do |env|
  env.response.content_type = "application/json"
  env.session.destroy
  { result: "success", messge: "logout successfull"}.to_json
end

Kemal.run do |config|
  server = config.server.not_nil!
  server.bind_tcp "0.0.0.0", 3000, reuse_port: true
end

