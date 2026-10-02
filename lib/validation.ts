import {z} from 'zod';
export const companySchema=z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(80),color:z.string().regex(/^#[0-9a-fA-F]{6}$/)});
export const postSchema=z.object({
 id:z.string().min(1).max(100),companyId:z.string().min(1).max(100),title:z.string().trim().min(1).max(150),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d=>{const n=new Date(d+'T12:00:00Z');return !Number.isNaN(n.getTime())&&n.toISOString().slice(0,10)===d}),
 time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),format:z.enum(['Feed','Stories','Reels']),notes:z.string().max(5000),
 image:z.string().regex(/^(|\/api\/images\/[0-9a-f-]{36})$/),published:z.union([z.literal(0),z.literal(1)])
});
export const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('saveCompany'),company:companySchema}),
 z.object({action:z.literal('deleteCompany'),id:z.string().min(1).max(100)}),
 z.object({action:z.literal('savePost'),post:postSchema}),
 z.object({action:z.literal('deletePost'),id:z.string().min(1).max(100)}),
 z.object({action:z.literal('setPublished'),id:z.string().min(1).max(100),published:z.union([z.literal(0),z.literal(1)])})
]);
