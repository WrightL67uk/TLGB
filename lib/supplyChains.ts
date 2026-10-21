// Supply chain finder: where to register to get onto buyers' tender lists.
// Every link was checked to be live in October 2026. Sign-up codes are the ones the
// buyer published at the time and can change, so the page says so.

export type ChainGroup = 'contractor' | 'housebuilder' | 'scheme' | 'portal' | 'framework' | 'news';

export const GROUP_LABEL: Record<ChainGroup, string> = {
  contractor: 'Main contractors',
  housebuilder: 'Housebuilders',
  scheme: 'Prequalification schemes',
  portal: 'Public tender portals',
  framework: 'Frameworks and buying groups',
  news: 'Where subcontract packages get advertised',
};

export const GROUP_HELP: Record<ChainGroup, string> = {
  contractor: 'Tier 1 contractors. Most will only invite you to price once you are on their approved list, and most use Constructionline or their own portal to vet you first.',
  housebuilder: 'Housebuilders buy landscaping, fencing and groundworks regionally. The supply chain page tells you how they work; the real door is usually the regional commercial or buying team.',
  scheme: 'The accreditations buyers ask for. Get these sorted first, because almost every PQQ asks for one of them.',
  portal: 'Where public sector tenders are published and submitted. Register once on each and set up alerts for your trades.',
  framework: 'Buyers group work into frameworks lasting several years. Getting onto one, or onto the supply chain of a contractor who is on one, gives you repeat work.',
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

  // Housebuilders
  { name: 'Persimmon Homes', group: 'housebuilder', url: 'https://persimmonhomes.com/corporate/about-us/who-we-are/our-suppliers', note: 'How Persimmon works with suppliers and subcontractors.' },
  { name: 'Bellway', group: 'housebuilder', url: 'https://bellwayplc.co.uk/sustainability/construction/supply-chain-management', note: 'Bellway supply chain management. Approach the regional division buying team for your area.' },

  // Prequalification schemes
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

  // News
  { name: 'Construction Enquirer', group: 'news', url: 'https://www.constructionenquirer.com', note: 'Regularly runs "subcontractors wanted" stories when contractors win big jobs and need packages priced.' },
];
