
import { Student } from '../types';

const rawCsvData = `website_user_id,tracking_number,student_id,full_name,school,stream,district,last_paper_marks,payment_this_month,id_verified,email,email_verified
uid_a1b2c1,TRK-8821,101,Pramodya Ishan,Royal College,ET,Colombo,88,Paid,TRUE,26002ishan@gmail.com,TRUE
uid_d4e5f6,TRK-9002,102,Kasun Perera,Richmond College,BST,Galle,65,Pending,TRUE,kasun.p@example.com,FALSE
uid_g7h8i9,TRK-9003,103,Amara Silva,Maliyadeva College,ET,Kurunegala,92,Paid,FALSE,amara.s@example.com,TRUE
uid_j0k1l2,TRK-9004,104,Mohamed Fazil,Zahira College,BST,Colombo,74,Failed,TRUE,fazil.m@example.com,TRUE
uid_m3n4o5,TRK-9005,105,Thilini De Silva,Visakha Vidyalaya,ET,Colombo,Absent,Paid,TRUE,thilini.d@example.com,TRUE
uid_p6q7r8,TRK-9006,106,S. Ravindran,Jaffna Hindu College,BST,Jaffna,55,Pending,FALSE,ravi.s@example.com,FALSE
uid_s9t0u1,TRK-9007,107,Nimali Fernando,Museus College,ET,Kalutara,81,Paid,TRUE,nimali.f@example.com,TRUE
uid_v2w3x4,TRK-9008,108,Nuwan Pradeep,Rahula College,BST,Matara,45,Paid,TRUE,nuwan.p@example.com,TRUE
uid_y5z6a7,TRK-9009,109,Kavindi Ekanayake,Mahamaya Girls,ET,Kandy,89,Paid,TRUE,kavindi.e@example.com,TRUE
uid_b8c9d0,TRK-9010,110,Dilshan Madushanka,Ananda College,ET,Colombo,76,Pending,TRUE,dilshan.m@example.com,FALSE
uid_e1f2g3,TRK-9011,111,Fathima Ayesha,Muslim Ladies College,BST,Colombo,68,Paid,TRUE,fathima.a@example.com,TRUE
uid_h4i5j6,TRK-9012,112,Lahiru Kumara,St. Thomas College,ET,Gampaha,95,Paid,TRUE,lahiru.k@example.com,TRUE
uid_k7l8m9,TRK-9013,113,Sanduni Weerasinghe,Devi Balika,BST,Colombo,58,Pending,FALSE,sanduni.w@example.com,TRUE
uid_n0o1p2,TRK-9014,114,Ruwan Jayasuriya,Kingswood College,ET,Kandy,82,Paid,TRUE,ruwan.j@example.com,TRUE
uid_q3r4s5,TRK-9015,115,Manjula Herath,Ibbagamuwa Central,BST,Kurunegala,61,Paid,TRUE,manjula.h@example.com,TRUE
uid_t6u7v8,TRK-9016,116,Gayan Senanayake,Dharmaraja College,ET,Kandy,77,Failed,TRUE,gayan.s@example.com,FALSE
uid_w9x0y1,TRK-9017,117,Poshitha Gunawardena,Nalanda College,ET,Colombo,90,Paid,TRUE,poshitha.g@example.com,TRUE
uid_z2a3b4,TRK-9018,118,Hashini Perera,Holy Family Convent,BST,Colombo,42,Pending,TRUE,hashini.p@example.com,TRUE
uid_c5d6e7,TRK-9019,119,Isuru Udana,St. Aloysius,ET,Galle,66,Paid,TRUE,isuru.u@example.com,TRUE
uid_f8g9h0,TRK-9020,120,Chathura Dhananjaya,Bandaranayake College,BST,Gampaha,70,Paid,TRUE,chathura.d@example.com,FALSE
uid_i1j2k3,TRK-9021,121,Shehan Karunaratne,Royal College,ET,Colombo,85,Paid,TRUE,shehan.k@example.com,TRUE
uid_l4m5n6,TRK-9022,122,Malsha Thirimanne,Sirimavo Bandaranaike,BST,Colombo,55,Pending,FALSE,malsha.t@example.com,TRUE
uid_o7p8q9,TRK-9023,123,Supun Tharanga,Mahinda College,ET,Galle,79,Paid,TRUE,supun.t@example.com,TRUE
uid_r0s1t2,TRK-9024,124,Ramesh Mendis,St. Servatius,BST,Matara,60,Paid,TRUE,ramesh.m@example.com,TRUE
uid_u3v4w5,TRK-9025,125,Dinuka Hettiarachchi,Anula Vidyalaya,ET,Colombo,91,Paid,TRUE,dinuka.h@example.com,TRUE
uid_x6y7z8,TRK-9026,126,Janith Liyanage,D.S. Senanayake,ET,Colombo,73,Pending,TRUE,janith.l@example.com,FALSE
uid_a9b0c1,TRK-9027,127,Udeshika Prabodhani,Ferguson High School,BST,Ratnapura,88,Paid,TRUE,udeshika.p@example.com,TRUE
uid_d2e3f4,TRK-9028,128,Asela Gunaratne,St. Peter's,ET,Colombo,50,Failed,TRUE,asela.g@example.com,TRUE
uid_g5h6i7,TRK-9029,129,Chamari Atapattu,Mahamaya Girls,BST,Kandy,94,Paid,TRUE,chamari.a@example.com,TRUE
uid_j8k9l0,TRK-9030,130,Dasun Shanaka,Maris Stella,ET,Negombo,67,Paid,TRUE,dasun.s@example.com,TRUE
uid_m1n2o3,TRK-9031,131,Wanindu Hasaranga,Richmond College,BST,Galle,72,Pending,TRUE,wanindu.h@example.com,TRUE
uid_p4q5r6,TRK-9032,132,Bhanuka Rajapaksa,Royal College,ET,Colombo,80,Paid,TRUE,bhanuka.r@example.com,TRUE
uid_s7t8u9,TRK-9033,133,Oshada Fernando,St. Sebastian's,ET,Moratuwa,63,Paid,TRUE,oshada.f@example.com,FALSE
uid_v0w1x2,TRK-9034,134,Pathum Nissanka,Isipathana College,BST,Colombo,78,Paid,TRUE,pathum.n@example.com,TRUE
uid_y3z4a5,TRK-9035,135,Dushmantha Chameera,Maris Stella,ET,Negombo,59,Pending,TRUE,dushmantha.c@example.com,TRUE
uid_b6c7d8,TRK-9036,136,Maheesh Theekshana,St. Benedict's,BST,Colombo,84,Paid,TRUE,maheesh.t@example.com,TRUE
uid_e9f0g1,TRK-9037,137,Charith Asalanka,Richmond College,ET,Galle,93,Paid,TRUE,charith.a@example.com,TRUE
uid_h2i3j4,TRK-9038,138,Dunith Wellalage,St. Joseph's,BST,Colombo,75,Paid,TRUE,dunith.w@example.com,TRUE
uid_k5l6m7,TRK-9039,139,Kamindu Mendis,Richmond College,ET,Galle,87,Pending,TRUE,kamindu.m@example.com,FALSE
uid_n8o9p0,TRK-9040,140,Matheesha Pathirana,Trinity College,BST,Kandy,69,Paid,TRUE,matheesha.p@example.com,TRUE
uid_q1r2s3,TRK-9041,141,Sadeera Samarawickrama,Thurstan College,ET,Colombo,64,Paid,TRUE,sadeera.s@example.com,TRUE
uid_t4u5v6,TRK-9042,142,Dilshan Madushanka,Hungama Vijayaba,BST,Hambantota,52,Failed,FALSE,dilshan.m2@example.com,TRUE
uid_w7x8y9,TRK-9043,143,Nuwan Thushara,Thurstan College,ET,Colombo,71,Paid,TRUE,nuwan.t@example.com,TRUE
uid_z0a1b2,TRK-9044,144,Akila Dananjaya,Mahanama College,BST,Colombo,57,Pending,TRUE,akila.d@example.com,TRUE
uid_c3d4e5,TRK-9045,145,Lakshan Sandakan,De Mazenod,ET,Kandana,62,Paid,TRUE,lakshan.s@example.com,TRUE
uid_f6g7h8,TRK-9046,146,Jefferey Vandersay,Wesley College,BST,Colombo,48,Paid,TRUE,jefferey.v@example.com,FALSE
uid_i9j0k1,TRK-9047,147,Binura Fernando,D.S. Senanayake,ET,Colombo,76,Paid,TRUE,binura.f@example.com,TRUE
uid_l2m3n4,TRK-9048,148,Praveen Jayawickrama,St. Sebastian's,BST,Moratuwa,83,Pending,TRUE,praveen.j@example.com,TRUE
uid_o5p6q7,TRK-9049,149,Asitha Fernando,St. Sebastian's,ET,Katuneriya,65,Paid,TRUE,asitha.f@example.com,TRUE
uid_r8s9t0,TRK-9050,150,Kasun Rajitha,St. Servatius,BST,Matara,56,Paid,TRUE,kasun.r@example.com,TRUE
uid_u1v2w3,TRK-9051,151,Vishwa Fernando,St. Sebastian's,ET,Moratuwa,74,Pending,FALSE,vishwa.f@example.com,TRUE
uid_x4y5z6,TRK-9052,152,Angelo Mathews,St. Joseph's,ET,Colombo,96,Paid,TRUE,angelo.m@example.com,TRUE
uid_a7b8c9,TRK-9053,153,Dimuth Karunaratne,St. Joseph's,BST,Colombo,81,Paid,TRUE,dimuth.k@example.com,TRUE
uid_d0e1f2,TRK-9054,154,Dinesh Chandimal,Ananda College,ET,Colombo,77,Failed,TRUE,dinesh.c@example.com,TRUE
uid_g3h4i5,TRK-9055,155,Kusal Mendis,Prince of Wales,BST,Moratuwa,68,Paid,TRUE,kusal.m@example.com,TRUE
uid_j6k7l8,TRK-9056,156,Kusal Perera,Royal College,ET,Colombo,89,Paid,TRUE,kusal.p@example.com,TRUE
uid_m9n0o1,TRK-9057,157,Niroshan Dickwella,Trinity College,BST,Kandy,73,Pending,TRUE,niroshan.d@example.com,FALSE
uid_p2q3r4,TRK-9058,158,Danushka Gunathilaka,Mahanama College,ET,Colombo,60,Paid,TRUE,danushka.g@example.com,TRUE
uid_s5t6u7,TRK-9059,159,Avishka Fernando,St. Sebastian's,BST,Moratuwa,79,Paid,TRUE,avishka.f@example.com,TRUE
uid_v8w9x0,TRK-9060,160,Minod Bhanuka,Maliyadeva College,ET,Kurunegala,85,Paid,TRUE,minod.b@example.com,TRUE
uid_y1z2a3,TRK-9061,161,Lahiru Thirimanne,Prince of Wales,BST,Moratuwa,66,Pending,TRUE,lahiru.t@example.com,TRUE
uid_b4c5d6,TRK-9062,162,Suranga Lakmal,Debarawewa Central,ET,Hambantota,75,Paid,TRUE,suranga.l@example.com,TRUE
uid_e7f8g9,TRK-9063,163,Nuwan Pradeep,St. Anthony's,BST,Kandy,54,Paid,TRUE,nuwan.p2@example.com,FALSE
uid_h0i1j2,TRK-9064,164,Rangana Herath,Maliyadeva College,ET,Kurunegala,98,Paid,TRUE,rangana.h@example.com,TRUE
uid_k3l4m5,TRK-9065,165,Thisara Perera,St. Joseph's,BST,Colombo,62,Pending,TRUE,thisara.p@example.com,TRUE
uid_n6o7p8,TRK-9066,166,Lasith Malinga,Vidyarathna,ET,Galle,90,Paid,TRUE,lasith.m@example.com,TRUE
uid_q9r0s1,TRK-9067,167,Mahela Jayawardene,Nalanda College,BST,Colombo,97,Paid,TRUE,mahela.j@example.com,TRUE
uid_t2u3v4,TRK-9068,168,Kumar Sangakkara,Trinity College,ET,Kandy,99,Paid,TRUE,kumar.s@example.com,TRUE
uid_w5x6y7,TRK-9069,169,Sanath Jayasuriya,St. Servatius,BST,Matara,85,Failed,TRUE,sanath.j@example.com,TRUE
uid_z8a9b0,TRK-9070,170,Muttiah Muralitharan,St. Anthony's,ET,Kandy,92,Paid,TRUE,muttiah.m@example.com,TRUE
uid_c1d2e3,TRK-9071,171,Chaminda Vaas,St. Joseph's,BST,Colombo,88,Paid,TRUE,chaminda.v@example.com,TRUE
uid_f4g5h6,TRK-9072,172,Marvan Atapattu,Ananda College,ET,Colombo,76,Pending,TRUE,marvan.a@example.com,FALSE
uid_i7j8k9,TRK-9073,173,Aravinda de Silva,D.S. Senanayake,BST,Colombo,95,Paid,TRUE,aravinda.d@example.com,TRUE
uid_l0m1n2,TRK-9074,174,Arjuna Ranatunga,Ananda College,ET,Colombo,84,Paid,TRUE,arjuna.r@example.com,TRUE
uid_o3p4q5,TRK-9075,175,Roshan Mahanama,Nalanda College,BST,Colombo,70,Paid,TRUE,roshan.m@example.com,TRUE
uid_r6s7t8,TRK-9076,176,Hashan Tillakaratne,D.S. Senanayake,ET,Colombo,69,Pending,TRUE,hashan.t@example.com,TRUE
uid_u9v0w1,TRK-9077,177,Romesh Kaluwitharana,St. Sebastian's,BST,Moratuwa,75,Paid,TRUE,romesh.k@example.com,TRUE
uid_x2y3z4,TRK-9078,178,Upul Chandana,Mahinda College,ET,Galle,61,Paid,TRUE,upul.c@example.com,TRUE
uid_a5b6c7,TRK-9079,179,Thilan Samaraweera,Ananda College,BST,Colombo,82,Paid,TRUE,thilan.s@example.com,TRUE
uid_d8e9f0,TRK-9080,180,Tillakaratne Dilshan,Kalutara Vidyalaya,ET,Kalutara,91,Pending,TRUE,dilshan.t@example.com,TRUE
uid_g1h2i3,TRK-9081,181,Farveez Maharoof,Wesley College,BST,Colombo,58,Paid,TRUE,farveez.m@example.com,FALSE
uid_j4k5l6,TRK-9082,182,Jehan Mubarak,Royal College,ET,Colombo,45,Failed,TRUE,jehan.m@example.com,TRUE
uid_m7n8o9,TRK-9083,183,Upul Tharanga,Dharmasoka College,BST,Ambalangoda,78,Paid,TRUE,upul.t@example.com,TRUE
uid_p0q1r2,TRK-9084,184,Chamara Kapugedera,Dharmaraja College,ET,Kandy,64,Paid,TRUE,chamara.k@example.com,TRUE
uid_s3t4u5,TRK-9085,185,Chamara Silva,Panadura Royal,BST,Panadura,53,Pending,TRUE,chamara.s@example.com,TRUE
uid_v6w7x8,TRK-9086,186,Malinga Bandara,Kalutara Vidyalaya,ET,Kalutara,59,Paid,TRUE,malinga.b@example.com,TRUE
uid_y9z0a1,TRK-9087,187,Nuwan Kulasekara,Bandaranayake College,BST,Gampaha,86,Paid,TRUE,nuwan.k@example.com,TRUE
uid_b2c3d4,TRK-9088,188,Ajantha Mendis,Moratu Maha Vidyalaya,ET,Moratuwa,79,Paid,TRUE,ajantha.m@example.com,TRUE
uid_e5f6g7,TRK-9089,189,Thilina Kandamby,Ananda College,BST,Colombo,67,Pending,FALSE,thilina.k@example.com,TRUE
uid_h8i9j0,TRK-9090,190,Suraj Randiv,Rahula College,ET,Matara,55,Paid,TRUE,suraj.r@example.com,TRUE
uid_k1l2m3,TRK-9091,191,Dhammika Prasad,De Mazenod,BST,Kandana,63,Paid,TRUE,dhammika.p@example.com,TRUE
uid_n4o5p6,TRK-9092,192,Kaushal Lokuarachchi,St. Peter's,ET,Colombo,49,Failed,TRUE,kaushal.l@example.com,TRUE
uid_q7r8s9,TRK-9093,193,Gayan Wijekoon,Maliyadeva College,BST,Kurunegala,57,Paid,TRUE,gayan.w@example.com,TRUE
uid_t0u1v2,TRK-9094,194,Dilruwan Perera,Panadura Royal,ET,Panadura,72,Paid,TRUE,dilruwan.p@example.com,TRUE
uid_w3x4y5,TRK-9095,195,Milinda Siriwardana,Kalutara Vidyalaya,BST,Kalutara,65,Pending,TRUE,milinda.s@example.com,TRUE
uid_z6a7b8,TRK-9096,196,Sachithra Senanayake,St. Joseph's,ET,Colombo,71,Paid,TRUE,sachithra.s@example.com,TRUE
uid_c9d0e1,TRK-9097,197,Seekkuge Prasanna,Mahinda . iCollege,BST,Galle,50,Paid,TRUE,seekkuge.p@example.com,FALSE
uid_f2g3h4,TRK-9098,198,Kithuruwan Vithanage,Royal College,ET,Colombo,60,Paid,TRUE,kithuruwan.v@example.com,TRUE
uid_i5j6k7,TRK-9099,199,Chaturanga de Silva,St. Aloysius,BST,Galle,56,Pending,TRUE,chaturanga.d@example.com,TRUE
uid_l8m9n0,TRK-9100,200,Ramith Rambukwella,Royal College,ET,Colombo,52,Paid,TRUE,ramith.r@example.com,TRUE`;

export const getStudentDatabase = (): Student[] => {
  const lines = rawCsvData.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const student: any = {};
    headers.forEach((header, index) => {
      student[header.trim()] = values[index]?.trim();
    });
    return student as Student;
  });
};
