import { Editor } from "./editor";

interface DocuementIdPageProps {
    params:Promise<{documentId: string}>;
};

const DocumentIdPage = async({ params }: DocuementIdPageProps) => {
    const awaitedParams = await params;
    const documentId = awaitedParams.documentId;
    return ( 
        <div className="min-h-screen bg-background">
        <Editor />
        </div>
     );
}
 
export default DocumentIdPage;