# Getting Started

Welcome to your new project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch` 
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).


## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.

# Things done

create  BAS App

connect git repo - straight forward thing, add user, set/generate .ssh key


Do a cf logon to you preferred space - not clarified how db is chose, it took the existing hana cloud instance

cf login -a https://api.cf.ap10.hana.ondemand.com
API endpoint: https://api.cf.ap10.hana.ondemand.com
Email: john.do@mycompany.com
Password:
Authenticating...
OK

Custom IdP
cf login -a https://api.cf.ap10.hana.ondemand.com --origin <IdP Name>
API endpoint: https://api.cf.ap10.hana.ondemand.com
Email: john.do@mycompany.com
Password:
Authenticating...
OK

Corporate IdP
cf login -a https://api.cf.ap10.hana.ondemand.com --sso
API endpoint: https://api.cf.ap10.hana.ondemand.com
Temporary Authentication Code ( Get one at
https://login.cf.ap10.hana.ondemand.com/passcode ): <Temporary Authentication Code, e.g. yF1e16KTjS>
Authenticating...
OK

 -- not needed add hana db :  cds add hana  , if previously worked with sample data 

 cds deploy --to hana

 use deploy button , in BAS Low code - stuff is running in org, space where you logged on before


Quite some services are created:
 
BusinessAppRB2-connectivity
Connectivity Service
lite
1 binding
Created

BusinessAppRB2-db
SAP HANA Schemas & HDI Containers
hdi-shared
2 bindings; 1 key
Created

BusinessAppRB2-destination
Destination Service
lite
1 binding; 1 key
Created

BusinessAppRB2-html5-apps-repo-host
HTML5 Application Repository Service
app-host
2 keys
Created

BusinessAppRB2-metadata
User-Provided
1 binding
Created


BusinessAppRB2-uaa
Authorization and Trust Management Service
application
2 bindings; 1 key
Created


APPs:

Stopped	BusinessAppRB2-db-deployer	
0/1
1024 MB	256 MB	


Started	BusinessAppRB2-srv	
1/1
1024 MB	256 MB


https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/c93afb5743a04b62afea0fe1def00062.html?locale=en-US



HTML5 Repo deployment:
- https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/07c679672e5f423e9dc631fc85b51da3.html

UI5 Tooling
- https://sap.github.io/ui5-tooling/pages/CLI/#ui5-build