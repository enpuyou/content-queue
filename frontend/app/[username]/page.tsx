import { Metadata } from "next";
import PublicProfileClient from "./PublicProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `${params.username}'s Profile | sed.i`,
    description: `Public reading list and vinyl crate for ${params.username}.`,
  };
}

export default async function PublicProfilePage(props: {
  params: Promise<{ username: string }>;
}) {
  const params = await props.params;
  return <PublicProfileClient username={params.username} />;
}
