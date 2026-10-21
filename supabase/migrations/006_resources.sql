-- 006: suppliers directory, help board, accreditation help enquiries

create table if not exists suppliers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  name          text not null,
  categories    text[] not null default '{}',
  description   text,
  website       text,
  phone         text,
  email         text,
  town          text,
  postcode      text,
  lat           double precision,
  lng           double precision,
  delivers_nationally boolean not null default false,
  submitted_by  text
);
create index if not exists suppliers_status_idx on suppliers (status);
create index if not exists suppliers_categories_idx on suppliers using gin (categories);
alter table suppliers enable row level security;

create table if not exists help_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text not null default 'open' check (status in ('open', 'closed', 'removed')),
  email         text not null,
  business_name text,
  kind          text not null,
  title         text not null,
  details       text not null,
  trades        text[] not null default '{}',
  postcode      text,
  town          text,
  lat           double precision,
  lng           double precision,
  needed_from   date,
  needed_until  date
);
create index if not exists help_requests_status_idx on help_requests (status, created_at desc);
alter table help_requests enable row level security;

create table if not exists service_enquiries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  service       text not null,
  name          text not null,
  business_name text,
  email         text not null,
  phone         text,
  schemes       text[] not null default '{}',
  message       text,
  handled       boolean not null default false
);
alter table service_enquiries enable row level security;

-- Starter suppliers (checked against each company's own website, October 2026)
insert into suppliers (status, name, categories, description, website, phone, town, postcode, delivers_nationally) values
('approved','Melcourt Industries',array['soil-aggregates'],'Peat-free composts, topsoils, mulches, natural play surfaces and decorative grits and gravels for trade customers.','https://www.melcourt.co.uk','01666 502711','Tetbury, Gloucestershire','GL8 8RT',true),
('approved','Boughton Loam',array['soil-aggregates'],'Topsoils, subsoils, SuDS soils, green roof substrates, cricket loams and lawn dressings. UK distributor of British Sugar TOPSOIL.','https://www.boughton.co.uk','01536 510515','Burton Latimer, Northamptonshire','NN15 5TB',true),
('approved','Bourne Amenity',array['soil-aggregates','turf-seed'],'Topsoils, subsoils, sports sands, barks, grass seed, fertilisers, aggregates and decorative stone.','https://www.bourneamenity.co.uk','01797 252299','Newenden, Kent','TN18 5QG',false),
('approved','Rolawn',array['turf-seed','soil-aggregates'],'Lawn turf, topsoil, bark and mulch, compost, decorative aggregates and green roof kits.','https://www.rolawn.co.uk','01904 757372','Seaton Ross, York','YO42 4NF',true),
('approved','Tillers Turf',array['turf-seed'],'Landscape, golf and wildflower turf delivered across the UK.','https://www.tillersturf.co.uk','01522 704444','Thorney, Newark','NG23 7DR',true),
('approved','Q Lawns',array['turf-seed','soil-aggregates'],'Lawn turf, topsoil and Meadowmat wildflower matting grown in Norfolk and delivered across the UK.','https://www.qlawns.co.uk',null,'Norfolk',null,true),
('approved','Emorsgate Seeds',array['turf-seed'],'Native British wildflower seed, grasses, sedges and seed mixtures.','https://wildseed.co.uk',null,'Somerset and Norfolk',null,true),
('approved','Rigby Taylor',array['turf-seed','landscape-products'],'Grass seed, fertilisers, plant protection, irrigation and line marking for sports and amenity turf.','https://www.rigbytaylor.com','0800 138 7222','Royston, Hertfordshire',null,true),
('approved','Barcham Trees',array['trees-plants'],'Container-grown trees, from young stock to semi-mature, for landscape schemes.','https://www.barcham.co.uk','01353 720950','Ely, Cambridgeshire','CB7 5XF',true),
('approved','Majestic Trees',array['trees-plants'],'Mature and semi-mature trees, pleached trees, hedging and fruit trees.','https://www.majestictrees.co.uk','01582 843881','Flamstead, Hertfordshire',null,true),
('approved','Deepdale Trees',array['trees-plants'],'Air-Pot and field-grown semi-mature trees, shrubs and hedging for the trade.','https://www.deepdale-trees.co.uk','01767 262636','Bedfordshire',null,true),
('approved','Palmstead Nurseries',array['trees-plants'],'Wholesale trees, shrubs and perennials for the landscape trade.','https://www.palmstead.co.uk','01233 813340','Kent',null,true),
('approved','Crowders Nurseries',array['trees-plants'],'Wholesale nursery stock, forestry and hedging transplants, cell-grown plants and tree protection.','https://www.crowdersnurseries.co.uk','01507 525000','Lincolnshire',null,true),
('approved','Frank P Matthews',array['trees-plants'],'Fruit and ornamental trees, soft fruit, hedging and rootstocks. Wholesale line shown.','https://www.frankpmatthews.com','01584 810214','Tenbury Wells, Worcestershire','WR15 8TH',true),
('approved','Hopes Grove Nurseries',array['trees-plants'],'Hedging (bare root, potted, rootball and instant), garden trees, shrubs and topiary.','https://www.hopesgrovenurseries.co.uk','01580 765600','Weald of Kent',null,true),
('approved','Jacksons Fencing',array['fencing-gates'],'Timber and metal fencing, gates, acoustic and security fencing, decking and landscaping products.','https://www.jacksons-fencing.co.uk','0800 408 2234','Stowting, Kent',null,true),
('approved','Zaun',array['fencing-gates'],'Welded and woven mesh fencing, security and sports fencing, gates and bollards.','https://www.zaun.co.uk','01902 796699','Wolverhampton','WV10 9ED',true),
('approved','CLD Fencing Systems',array['fencing-gates'],'Rigid mesh security fencing, gates, sports, decorative and temporary fencing.','https://www.cld-fencing.com','0800 074 2861',null,null,true),
('approved','Grange Fencing',array['fencing-gates'],'Fencing panels, gates, garden structures and landscaping products.','https://www.grangefencing.co.uk',null,null,null,true),
('approved','Marshalls',array['paving-stone','soil-aggregates'],'Paving, kerbs, walling, drainage, aggregates and landscape products for commercial and domestic work.','https://www.marshalls.co.uk',null,'Elland, West Yorkshire','HX5 9HT',true),
('approved','Stonemarket',array['paving-stone'],'Garden and driveway paving, kerbs, edging and walling, sold through independent stockists.','https://www.stonemarket.co.uk',null,'Elland, West Yorkshire','HX5 9HT',true),
('approved','London Stone',array['paving-stone'],'Paving, steps, copings, cladding, decking and bespoke stonework, with showrooms across the UK.','https://www.londonstone.co.uk',null,null,null,true),
('approved','CED Stone Group',array['paving-stone'],'Natural stone, paving, setts, gravels and hard landscaping materials for commercial and private projects.','https://www.cedstone.co.uk','01708 867237','Essex',null,true),
('approved','GreenBlue Urban',array['landscape-products'],'Tree pits and soil cells, root barriers, underground guying and SuDS tree pit systems.','https://www.greenblue.com/gb/',null,null,null,true),
('approved','Namgrass',array['artificial-play'],'Artificial grass for residential, commercial, school and sports projects.','https://www.namgrass.co.uk','03330 151853','Oakham, Rutland','LE15 7TP',true),
('approved','Honey Brothers',array['tools-machinery'],'Arborist climbing and rigging gear, PPE, forestry and landscaping tools and machinery.','https://www.honeybros.com','01483 561362','Peasmarsh, Surrey',null,true);
