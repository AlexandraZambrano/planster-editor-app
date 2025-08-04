import { Editor } from "./editor";
import Toolbar from "./toolbar";

interface DocuementIdPageProps {
    params:Promise<{documentId: string}>;
};

const DocumentIdPage = async({ params }: DocuementIdPageProps) => {
    const awaitedParams = await params;
    const documentId = awaitedParams.documentId;
    return ( 
        <div className="min-h-screen bg-[#FAFBFD]">
        <Toolbar />
        <Editor />
        </div>
     );
}
 
export default DocumentIdPage;