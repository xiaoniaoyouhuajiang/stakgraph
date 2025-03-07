### sed

sed "s/^ruby=.\*/ruby '3\.2\.1'" Gemfile

sed "s/git_source/nunu" Gemfile

-i: inplace
-e: multi
-r: extended regex with character ranges
sed -i -e -r "s/ruby '[0-9]+\.[0-9]+\.[0-9]+'/ruby '3.2.2'/g" Gemfile

sed -i -e 's/ruby/buby/g' Gemfile

sed -i -e "s/3/'3.2.2'/g" Gemfile

sed -i -e -r "s/'[0-9]+\.[0-9]+\.[0-9]+'/'3.2.2'/g" Gemfile

### promt

Given a Ruby on Rails routing setup like this:

config/routes.rb:

```rb
require "sidekiq/web"
require 'sidekiq/cron/web'

Rails.application.routes.draw do
    #Payments
    get '/lnd_payments/request', to: 'lnd_payments#request_payment'
    get '/lnd_payments/check', to: 'lnd_payments#check'
end
```

app/controllers/admin/lnd_payments_controller.rb

```rb
class Admin::LndPaymentsController < Admin2Controller
  def request_payment
    # code here
  end

  def check
    # code here
  end
end
```

I want to match all endpoints defined in routes.rb with their controllers. Please write a Rust script that searches a repository for files that end with "\_controller.rb", and matches the function name.
