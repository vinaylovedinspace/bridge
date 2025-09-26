import { Suspense } from 'react';

type SearchParams = { [key: string]: string };

export default async function Forms({}: { searchParams: SearchParams }) {
  return <Suspense fallback={<div>Loading...</div>}></Suspense>;
}
