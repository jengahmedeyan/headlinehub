-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "hash" TEXT,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "title" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_link_key" ON "Article"("link");

-- CreateIndex
CREATE UNIQUE INDEX "Article_hash_key" ON "Article"("hash");

-- CreateIndex
CREATE INDEX "Article_scrapedAt_idx" ON "Article"("scrapedAt");

-- CreateIndex
CREATE INDEX "Article_date_idx" ON "Article"("date");

-- CreateIndex
CREATE INDEX "Article_source_idx" ON "Article"("source");

-- CreateIndex
CREATE UNIQUE INDEX "summaries_article_id_version_key" ON "summaries"("article_id", "version");

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
