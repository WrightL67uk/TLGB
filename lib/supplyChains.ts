// Supply chain finder: where to register to get onto buyers' tender lists.
// Every link was checked to be live in October or November 2026. Sign-up codes are the ones the
// buyer published at the time and can change, so the page says so.

export type ChainGroup = 'contractor' | 'housebuilder' | 'housing' | 'infrastructure' | 'grounds' | 'landowner' | 'scheme' | 'portal' | 'framework' | 'domestic' | 'news';

export const GROUP_LABEL: Record<ChainGroup, string> = {
  contractor: 'Main contractors',
  housebuilder: 'Housebuilders',
  housing: 'Housing associations, managing agents and open space companies',
  infrastructure: 'Highways, rail, utilities and water',
  grounds: 'Grounds maintenance and facilities contractors',
  landowner: 'Public landowners and estates',
  scheme: 'Prequalification schemes',
  portal: 'Public tender portals',
  framework: 'Frameworks and buying groups',
  domestic: 'Homeowner and domestic lead schemes',
  news: 'Where subcontract packages get advertised',
};

export const GROUP_HELP: Record<ChainGroup, string> = {
  contractor: 'Tier 1 contractors. Most will only invite you to price once you are on their approved list, and most use Constructionline or their own portal to vet you first.',
  housing: 'These are the people who actually hold the grounds maintenance, tree, fencing, cleaning and estate repair budgets, and most of them buy direct rather than through a big contractor. Housing associations have to advertise, so register on their portal and watch Find a Tender. Managing agents and open space companies appoint regional contractors on their own say-so, so a well put together introduction counts for a lot.',
  infrastructure: 'Clients and tier 1s on roads, rail, power and water. Verge and vegetation work, fencing, drainage, surfacing, ecology and tree work all run through these. Most need RISQS (rail) or Achilles UVDB (utilities) before they will talk to you.',
  grounds: 'The big grounds maintenance, arboriculture and facilities companies subcontract mowing, tree work, pest control, fencing and winter work regionally. Worth registering even if the page says they mostly self-deliver.',
  landowner: 'Forestry bodies, the Environment Agency and similar landowners let tree, fencing, habitat, drainage and civils work in regional lots that smaller firms can win directly.',
  housebuilder: 'Housebuilders buy landscaping, fencing and groundworks regionally. The supply chain page tells you how they work; the real door is usually the regional commercial or buying team.',
  scheme: 'The accreditations buyers ask for. Get these sorted first, because almost every PQQ asks for one of them.',
  portal: 'Where public sector tenders are published and submitted. Register once on each and set up alerts for your trades.',
  framework: 'Buyers group work into frameworks lasting several years. Getting onto one, or onto the supply chain of a contractor who is on one, gives you repeat work.',
  domestic: 'For gardeners, landscapers, fencers, tree surgeons, pest controllers and decking or paving firms who want homeowner work. Most charge a fee, so read the small print.',
  news: 'Contractors advertise packages they need pricing here, often with a deadline only a few days away.',
};

export type ChainLink = {
  name: string;
  group: ChainGroup;
  url: string;
  note: string;
  needs?: string;  // what they ask for
  code?: string;   // published Constructionline sign-up code
};

export const SUPPLY_CHAINS: ChainLink[] = [
  // Main contractors
  { name: 'Balfour Beatty', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/balfour-beatty/', note: 'Vets its supply chain through Constructionline. Register through their partnership page and complete your profile.', needs: 'Constructionline Gold', code: 'BBPQQ' },
  { name: 'Kier', group: 'contractor', url: 'https://www.kier.co.uk/supply-chain/collaborating-with-us/', note: 'How Kier works with its supply chain. Prequalification is through Constructionline (partnership page linked below).', needs: 'Constructionline Gold' },
  { name: 'Kier (Constructionline sign-up)', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/kier/', note: 'Kier Construction partnership page on Constructionline.', needs: 'Constructionline Gold', code: 'KIER25' },
  { name: 'Kier Utilities and Highways', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/kier-utilities-and-highway/', note: 'Separate Constructionline partnership for Kier highways and utilities work, which includes verge, planting and fencing packages.', needs: 'Constructionline' },
  { name: 'Wates', group: 'contractor', url: 'https://wates.co.uk/supply-chain-partners', note: 'Wates supply chain partners page. Prequalification is through Constructionline.', needs: 'Constructionline Gold', code: 'WTS25' },
  { name: 'BAM Construct UK', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/bam/', note: 'BAM vets subcontractors through Constructionline.', needs: 'Constructionline Gold and an SSIP certificate' },
  { name: 'VINCI Building', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/vinci/', note: 'VINCI partnership page on Constructionline.', needs: 'Constructionline Gold', code: 'VIN21' },
  { name: 'Amey', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/amey/', note: 'Highways, rail and facilities work, including grounds maintenance and soft estate.', needs: 'Constructionline Gold', code: 'Amey21' },
  { name: 'Keltbray', group: 'contractor', url: 'https://www.constructionline.co.uk/buyers/partnership/keltbray/', note: 'Infrastructure, demolition and civils. Prequalification through Constructionline.', needs: 'Constructionline Gold and SSIP', code: '1ZIJZY' },
  { name: 'Morgan Sindall Construction', group: 'contractor', url: 'https://www.morgansindallconstruction.com/supply-chain/', note: 'Their page for SMEs who want to join the supply chain, with how to register.' },
  { name: 'Morgan Sindall Infrastructure', group: 'contractor', url: 'https://morgansindallinfrastructure.com/supply-chain', note: 'Highways, rail, energy and water work.' },
  { name: "Laing O'Rourke", group: 'contractor', url: 'https://www.laingorourke.com/supply-chain/uk-supply-chain-partners/', note: 'UK supply chain partner information.' },
  { name: 'Skanska UK', group: 'contractor', url: 'https://www.skanska.com/uk/en-gb/supply-chain/supplier-portal', note: 'Skanska supplier portal registration.' },
  { name: 'Mace', group: 'contractor', url: 'https://macegroup.com/corporate/supply-chain', note: 'Mace supply chain page.' },
  { name: 'Costain', group: 'contractor', url: 'https://costain.com/suppliers/becoming-a-supplier', note: 'Step by step guide to becoming a Costain supplier.' },
  { name: 'Bowmer + Kirkland', group: 'contractor', url: 'https://bandk.co.uk/supply-chain', note: 'Supply chain page with how to register interest. They also run regional supply chain events.' },
  { name: 'Graham', group: 'contractor', url: 'https://www.graham.co.uk/work-with-us/supply-chain/', note: 'Graham supply chain registration.' },
  { name: 'Lovell', group: 'contractor', url: 'https://corporate.lovell.co.uk/supply-chain', note: 'Lovell partnerships housing. Regularly looks for landscaping and fencing subcontractors.' },

  { name: 'Willmott Dixon', group: 'contractor', url: 'https://www.willmottdixon.co.uk/how-we-do-it/working-with-our-supply-chain', note: 'How Willmott Dixon works with its supply chain, with the route to register interest with the local construction office.' },
  { name: 'Galliford Try', group: 'contractor', url: 'https://www.gallifordtry.co.uk/sustainability/supply-chain/', note: 'Supply chain page. They are moving their subcontractors to Constructionline Gold.', needs: 'Constructionline Gold' },
  { name: 'Sir Robert McAlpine', group: 'contractor', url: 'https://www.srm.com/people-culture/supply-chain-partners/', note: 'Supply chain partners page. Prequalification is through Achilles BuildingConfidence.', needs: 'Achilles BuildingConfidence' },
  { name: 'Tilbury Douglas', group: 'contractor', url: 'https://www.tilburydouglas.co.uk/?p=828', note: 'Register your interest form for new supply chain partners. Schools, hospitals and civils across England.', needs: 'Constructionline Gold' },
  { name: 'VolkerWessels UK', group: 'contractor', url: 'https://www.volkerwessels.co.uk/en/our-approach/supply-chain', note: 'Covers VolkerFitzpatrick, VolkerHighways, VolkerRail and VolkerLaser. Prequalification through Constructionline.', needs: 'Constructionline', code: 'VW21' },
  { name: 'Robertson Group', group: 'contractor', url: 'https://www.robertson.co.uk/join-our-supply-chain', note: 'Scotland and the North of England. Register through their Constructionline partnership.', needs: 'Constructionline', code: 'ROBC24' },
  { name: 'Hochtief UK', group: 'contractor', url: 'https://hochtief.co.uk/supply-chain/', note: 'Infrastructure and building. Supply chain page with how to express interest.' },
  { name: 'Esh Group', group: 'contractor', url: 'https://eshgroup.co.uk/supply-chain/', note: 'North East, Yorkshire and Cumbria. Online form, reviewed quarterly, then an assessment questionnaire.' },
  { name: 'Seddon', group: 'contractor', url: 'https://www.seddon.co.uk/join-the-team/supply-chain', note: 'North West and Midlands building contractor. Supply chain sign-up page.' },
  { name: 'Wynne Construction', group: 'contractor', url: 'https://wynneconstruction.co.uk/work-with-us/', note: 'North Wales and the North West. Work with us page for subcontractors.' },
  { name: 'United Living', group: 'contractor', url: 'https://www.safecontractor.com/en-gb/united-living', note: 'Housing, infrastructure and property services. Vets subcontractors through SafeContractor.', needs: 'SafeContractor' },
  { name: 'McLaren Construction', group: 'contractor', url: 'https://mclarengroup.com/integrated-compliances/supply-chain', note: 'Onboards new subcontractors in partnership with Constructionline.', needs: 'Constructionline' },

  // Housebuilders
  { name: 'Persimmon Homes', group: 'housebuilder', url: 'https://persimmonhomes.com/corporate/about-us/who-we-are/our-suppliers', note: 'How Persimmon works with suppliers and subcontractors.' },
  { name: 'Bellway', group: 'housebuilder', url: 'https://bellwayplc.co.uk/sustainability/construction/supply-chain-management', note: 'Bellway supply chain management. Approach the regional division buying team for your area.' },
  { name: 'Berkeley Group', group: 'housebuilder', url: 'https://www.berkeleygroup.co.uk/our-vision/supply-chain', note: 'London and South East. Supply chain page explains their expectations and links to the supplier portal.' },
  { name: 'Vistry Group', group: 'housebuilder', url: 'https://www.cqms-ltd.co.uk/?p=6083', note: 'Vistry (Bovis, Linden, Countryside) prequalifies subcontractors through CQMS. Register there to be visible to their regions.' },
  { name: 'The Hill Group', group: 'housebuilder', url: 'https://www.hill.co.uk/subcontractors', note: 'London and the East. Subcontractor page with requirements.', needs: 'Constructionline Silver minimum, Gold for high risk trades' },
  { name: 'Crest Nicholson', group: 'housebuilder', url: 'https://crestnicholson.com/supply-chain', note: 'Supply chain code of conduct and policies. Approach the regional commercial team to get on their list.' },
  { name: 'Places for People', group: 'housebuilder', url: 'https://www.placesforpeople.co.uk/help-support/suppliers/', note: 'Housing association and developer. Supplier pages, tender process and a windows, external works and direct build DPS on Find a Tender.' },
  { name: 'Keepmoat', group: 'housebuilder', url: 'https://www.keepmoat.com', note: 'Partnership housebuilder across the North and Midlands. No central portal; email supplychain@keepmoat.com with your trades and regions.' },

  // Housing associations, managing agents and open space companies
  { name: 'Anchor', group: 'housing', url: 'https://www.anchor.org.uk/about-anchor/become-supplier', note: 'England\'s largest later-living landlord, 1,700 sites. Register on the Anchor Supply Portal to be considered for grounds, tree and estate works tenders.' },
  { name: 'FirstPort', group: 'housing', url: 'https://www.firstport.co.uk/about-us/contractors-suppliers/', note: 'The biggest residential managing agent in the UK. Contractor page with their accreditation process, H and S requirements and supplier portal guides.' },
  { name: 'Clarion Housing Group', group: 'housing', url: 'https://www.clarionhg.com/about/tender-opportunities/', note: 'Largest housing association in the UK, 125,000 homes. Register on their e-sourcing portal for tenders and dynamic purchasing systems; supplier assurance runs through Achilles.' },
  { name: 'L&Q', group: 'housing', url: 'https://www.lqgroup.org.uk/contact-us/supplying-goods-and-services-to-lq', note: 'London and South East, 95,000 homes. Free registration on their In-tend supplier portal; they publish a forward pipeline of what is coming up.' },
  { name: 'Peabody', group: 'housing', url: 'https://peabodygroup.org.uk/about-us/who-we-are/business-with-us', note: 'London and the South East. Supplier compliance through Alcumus, tenders through Delta eSourcing.' },
  { name: 'Notting Hill Genesis', group: 'housing', url: 'https://group.nhg.org.uk/about-us/partner-with-us/suppliers/', note: 'London. Lets gardening and cleaning in ten regional lots so smaller firms can bid. Tenders run on Delta eSourcing.' },
  { name: 'Hyde Group', group: 'housing', url: 'https://www.hyde-housing.co.uk/corporate/suppliers/procurement-frameworks/', note: 'London and the South. Over 50 frameworks and a minor works DPS you can join at any time.', needs: 'Constructionline Bronze minimum' },
  { name: 'Sanctuary', group: 'housing', url: 'https://www.sanctuary.co.uk/suppliers', note: 'England and Scotland, 250,000 people housed. Register on their ProContract portal; they publish a procurement pipeline PDF.' },
  { name: 'Sovereign Network Group', group: 'housing', url: 'https://sng.org.uk/working-with-us/suppliers-and-procurement', note: 'South, South West and London. Supplier handbook and In-tend portal; around 4,000 suppliers and spend near 800m a year.' },
  { name: 'The Riverside Group', group: 'housing', url: 'https://www.riverside.org.uk/about-us/procurement/', note: 'North West and national. Register on their In-tend portal; SSIP membership such as SafeContractor is expected.', needs: 'SSIP' },
  { name: 'Platform Housing Group', group: 'housing', url: 'https://www.platformhg.com/platform-housing-group-procurement', note: 'Midlands, 48,000 homes. Register on their Proactis portal; 18 month procurement pipeline published.' },
  { name: 'Your Housing Group', group: 'housing', url: 'https://yourhousinggroup.co.uk/about-us/become-a-supplier/', note: 'North West and Yorkshire. Become a supplier page and planned procurement notices on Find a Tender.' },
  { name: 'Housing Procurement Portal', group: 'housing', url: 'https://www.housingprocurement.com', note: 'The shared ProContract portal used by Home Group, Orbit, The Guinness Partnership and dozens of other associations. One free registration covers all of them.' },
  { name: 'Greenbelt Group', group: 'housing', url: 'https://www.greenbelt.co.uk', note: 'Owns and manages open space on over 1,000 new housing developments. Appoints regional grounds contractors directly; introduce yourself through mail@greenbelt.co.uk.' },
  { name: 'Meadfleet', group: 'housing', url: 'https://www.meadfleet.co.uk', note: 'Open space management on 320 developments across England and Wales, run from Stevenage. Regional contract managers appoint local grounds subcontractors.' },
  { name: 'Trinity Estates', group: 'housing', url: 'https://www.trinityestates.com', note: 'Residential managing agent based in Hemel Hempstead working with most national housebuilders. No portal; property managers appoint local contractors, so approach the regional office.' },
  { name: 'Rendall and Rittner', group: 'housing', url: 'https://www.safecontractor.com/en-gb/insights/customer-success/case-study-rendall-and-rittner/', note: 'Managing agent for 90,000 homes. Vets every contractor through SafeContractor, so get that first and then approach their property managers.', needs: 'SafeContractor' },
  { name: 'Savills Property Management', group: 'housing', url: 'https://www.savills.co.uk/services/property-management/supply-chain.aspx', note: 'Manages commercial estates, residential blocks and rural estates across the UK. Email ServicePartnerHub@savills.com to start Proactis registration.' },
  { name: 'CBRE', group: 'housing', url: 'https://www.cbre.com/about-us/supply-chain/suppliers-supply-chain-technologies-and-registration', note: 'The largest commercial property and FM manager. Register interest on their supplier portal; onboarding proper is by invitation once a CBRE contact sponsors you.' },

  // Highways, rail, utilities and water
  { name: 'National Highways', group: 'infrastructure', url: 'https://nationalhighways.co.uk/suppliers/guide-for-new-and-prospective-suppliers/', note: 'Guide for new suppliers. Most soft estate, fencing and barrier work is let by their maintenance contractors, who are listed on the page.' },
  { name: 'Network Rail', group: 'infrastructure', url: 'https://www.networkrail.co.uk/industry-and-commercial/supply-chain/becoming-a-supplier/', note: 'Becoming a supplier page. Lineside vegetation, fencing and drainage work needs RISQS first.', needs: 'RISQS' },
  { name: 'RISQS', group: 'infrastructure', url: 'https://www.risqs.org/suppliers', note: 'The rail industry supplier register. Needed before Network Rail or its contractors can use you.' },
  { name: 'HS2', group: 'infrastructure', url: 'https://www.hs2.org.uk/suppliers/hs2-and-your-business/', note: 'How to get work on HS2. Packages are advertised through CompeteFor.' },
  { name: 'CompeteFor', group: 'infrastructure', url: 'https://www.competefor.com', note: 'Free portal where HS2 and other big programmes publish subcontract packages.' },
  { name: 'UK Power Networks', group: 'infrastructure', url: 'https://www.ukpowernetworks.co.uk/our-company/suppliers-and-partners', note: 'Electricity network for London, South East and East. Tree cutting near lines is let to regional contractors who then subcontract.', needs: 'Achilles UVDB' },
  { name: 'Environment Agency', group: 'infrastructure', url: 'https://www.gov.uk/government/organisations/environment-agency/about/procurement', note: 'Flood, river and habitat work. Frameworks and smaller contracts appear on Find a Tender; the collaborative delivery contractors subcontract locally.' },
  { name: 'Transport for London', group: 'infrastructure', url: 'https://tfl.gov.uk/info-for/suppliers-and-contractors/become-a-tfl-supplier', note: 'How to become a TfL supplier. Direct contracts need RISQS and Ariba registration; most verge and station landscaping is let through their tier 1 contractors.' },

  // Grounds maintenance and facilities contractors
  { name: 'Ground Control', group: 'grounds', url: 'https://www.ground-control.co.uk/join-us/suppliers/', note: 'The biggest subcontracting grounds maintenance and arb business in the UK. Online supplier registration for mowing, tree, fencing, winter and pest work.' },
  { name: 'Mitie Landscapes', group: 'grounds', url: 'https://www.mitie.com/suppliers/', note: 'Facilities giant with a landscapes arm. Supplier page; onboarding is by invitation once you are on their radar.' },
  { name: 'idverde', group: 'grounds', url: 'https://www.idverde.co.uk', note: 'Council parks and grounds contracts across the UK. No portal; email tenders@idverde.co.uk with your trades and area.' },
  { name: 'Glendale', group: 'grounds', url: 'https://www.glendale-services.co.uk', note: 'Grounds, tree and countryside contractor. Contact busdev@glendale-services.co.uk to register interest.' },
  { name: 'Nurture Group', group: 'grounds', url: 'https://www.nurture-group.co.uk', note: 'Commercial grounds and winter services. Mostly self-delivered but takes on regional partners for peaks.' },

  // Public landowners and estates
  { name: 'Forestry England', group: 'landowner', url: 'https://www.forestryengland.uk/article/current-tenders', note: 'Tree planting, fencing, ground prep, civils and tree safety work let through their Panacea portal and district frameworks.' },
  { name: 'Forestry and Land Scotland', group: 'landowner', url: 'https://forestryandland.gov.scot/business-and-services/procurement', note: 'Scottish forestry estate. Contracts published on Public Contracts Scotland.' },
  { name: 'Natural Resources Wales', group: 'landowner', url: 'https://naturalresources.wales/about-us/what-we-do/strategies-and-plans/how-we-buy-what-we-need/?lang=en', note: 'Welsh forestry, flood and habitat work. Everything over 25k is advertised on Sell2Wales, with quick quotes below that.' },

  { name: 'Constructionline', group: 'scheme', url: 'https://www.constructionline.co.uk', note: 'The register most tier 1 contractors and many councils use. Gold level includes the common PQQ questions so you answer them once.', needs: 'Silver or Gold depending on the buyer' },
  { name: 'CHAS', group: 'scheme', url: 'https://www.chas.co.uk', note: 'Health and safety accreditation and SSIP member. Common with councils, housing associations and facilities companies.' },
  { name: 'SMAS Worksafe', group: 'scheme', url: 'https://www.smasltd.com', note: 'SSIP health and safety accreditation, often a cheaper route to an SSIP certificate.' },
  { name: 'SafeContractor', group: 'scheme', url: 'https://www.safecontractor.com', note: 'SSIP scheme used widely in facilities management and retail.' },
  { name: 'SSIP', group: 'scheme', url: 'https://ssip.org.uk', note: 'Explains the Safety Schemes in Procurement forum. One SSIP certificate should be accepted in place of another.' },
  { name: "Builder's Profile", group: 'scheme', url: 'https://www.buildersprofile.co.uk', note: 'Supply chain vetting platform used by several contractors.' },
  { name: 'Achilles UVDB', group: 'scheme', url: 'https://www.achilles.com', note: 'The utilities sector register. Needed for water, energy and telecoms work.' },
  { name: 'Avetta', group: 'scheme', url: 'https://www.avetta.com', note: 'Supplier vetting used by some large clients and contractors.' },
  { name: 'Supply Chain Sustainability School', group: 'scheme', url: 'https://www.supplychainschool.co.uk', note: 'Free membership and training. Many tier 1s ask their supply chain to join and it scores well on social value questions.' },

  // Public tender portals
  { name: 'Find a Tender', group: 'portal', url: 'https://www.find-tender.service.gov.uk', note: 'Where UK public contracts are now published under the Procurement Act 2023. Register and set alerts.' },
  { name: 'Contracts Finder', group: 'portal', url: 'https://www.contractsfinder.service.gov.uk', note: 'Older England portal, still used for some lower value and legacy contracts.' },
  { name: 'Public Contracts Scotland', group: 'portal', url: 'https://www.publiccontractsscotland.gov.uk', note: 'Scottish public sector tenders.' },
  { name: 'Sell2Wales', group: 'portal', url: 'https://www.sell2wales.gov.wales', note: 'Welsh public sector tenders.' },
  { name: 'eTendersNI', group: 'portal', url: 'https://etendersni.gov.uk', note: 'Northern Ireland public sector tenders.' },
  { name: 'ProContract', group: 'portal', url: 'https://procontract.due-north.com', note: 'Used by many councils and housing associations to run tenders. One login covers all of them.' },
  { name: 'Delta eSourcing', group: 'portal', url: 'https://www.delta-esourcing.com', note: 'Tender portal used by many councils, schools and public bodies.' },

  // Frameworks and buying groups
  { name: 'Fusion21', group: 'framework', url: 'https://www.fusion21.co.uk', note: 'Runs a UK-wide grounds maintenance framework for the public sector, plus building and refurbishment frameworks.' },
  { name: 'LHC Procurement Group', group: 'framework', url: 'https://lhcprocure.org.uk', note: 'Frameworks for housing and public buildings, including external works.' },
  { name: 'Pagabo', group: 'framework', url: 'https://www.pagabo.co.uk', note: 'National construction frameworks. The contractors appointed to them need subcontractors.' },
  { name: 'Government Commercial Agency', group: 'framework', url: 'https://www.gca.gov.uk', note: 'Replaced Crown Commercial Service in April 2026. Central government frameworks, including estates and construction works.' },
  { name: 'Procurement for Housing', group: 'framework', url: 'https://procurementforhousing.co.uk', note: 'Buying group for housing associations, including grounds maintenance.' },
  { name: 'ESPO', group: 'framework', url: 'https://www.espo.org', note: 'Public sector buying organisation used by councils and schools.' },
  { name: 'YPO', group: 'framework', url: 'https://www.ypo.co.uk', note: 'Public sector buying organisation with grounds and estates frameworks.' },
  { name: 'NEPO', group: 'framework', url: 'https://www.nepo.org', note: 'North East councils buying group. Uses the ProContract portal.' },
  { name: 'Scape', group: 'framework', url: 'https://www.scape.co.uk', note: 'Public sector construction frameworks. Find out which contractors hold them in your region.' },
  { name: 'Supplier Development Programme', group: 'framework', url: 'https://www.sdpscotland.co.uk', note: 'Free Scottish programme that trains small firms to win public contracts and runs meet the buyer events.' },

  // Homeowner and domestic lead schemes
  { name: 'TrustMark', group: 'domestic', url: 'https://www.trustmark.org.uk', note: 'The government endorsed quality scheme for work around the home. Landscapers join through the Association of Professional Landscapers.' },
  { name: 'Checkatrade', group: 'domestic', url: 'https://join.checkatrade.com', note: 'Paid directory with vetting and reviews. Strong for gardeners, fencing, paving, tree work and pest control.' },
  { name: 'Which? Trusted Traders', group: 'domestic', url: 'https://for-traders.which.co.uk', note: 'Assessed endorsement scheme. Slower to join, but carries weight with homeowners.' },

  // News
  { name: 'Construction Enquirer', group: 'news', url: 'https://www.constructionenquirer.com', note: 'Regularly runs "subcontractors wanted" stories when contractors win big jobs and need packages priced.' },
];
